import { useEffect, useRef } from "react";
import * as THREE from "three";
import gsap from "gsap";

export type OmegaState = "idle" | "listening" | "thinking" | "speaking";

export interface ParticleSphereProps {
  state: OmegaState;
  className?: string;
}

const PARTICLE_COUNT = 10000;
const SPHERE_RADIUS = 1.8;

// Mouse-follow tuning
const MOUSE_INFLUENCE = 0.6; // particles within this distance get pulled
const MOUSE_PULL = 0.5;      // strength of pull at distance=0
const DAMPING_RETURN = 0.15; // per-frame fraction of return-to-base (1 - DAMPING in spec terms)

interface StateConfig {
  color: number;
  rotateSpeed: number;
  particleSize: number;
}

const STATE_CFG: Record<OmegaState, StateConfig> = {
  idle:      { color: 0x22d3ee, rotateSpeed: 0.0008, particleSize: 0.025 },
  listening: { color: 0x60a5fa, rotateSpeed: 0.0006, particleSize: 0.030 },
  thinking:  { color: 0xa78bfa, rotateSpeed: 0.0014, particleSize: 0.028 },
  speaking:  { color: 0x34d399, rotateSpeed: 0.0010, particleSize: 0.027 },
};

function makeRoundParticleTexture(): THREE.CanvasTexture {
  const size = 96;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.35, "rgba(255,255,255,0.7)");
  grad.addColorStop(0.7, "rgba(255,255,255,0.18)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/** Fibonacci-sphere distribution — even spacing, no clumping. */
function fibonacciSphere(count: number, radius: number): Float32Array {
  const out = new Float32Array(count * 3);
  const golden = Math.PI * (Math.sqrt(5) - 1);
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / Math.max(1, count - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = golden * i;
    out[i * 3]     = Math.cos(theta) * r * radius;
    out[i * 3 + 1] = y * radius;
    out[i * 3 + 2] = Math.sin(theta) * r * radius;
  }
  return out;
}

export function ParticleSphere({ state, className }: ParticleSphereProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<OmegaState>(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const w0 = container.clientWidth || window.innerWidth;
    const h0 = container.clientHeight || window.innerHeight;

    // ---- scene + renderer
    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(45, w0 / h0, 0.1, 100);
    camera.position.set(0, 0, 7);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w0, h0);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // ---- particle setup
    const tex = makeRoundParticleTexture();
    const basePositions = fibonacciSphere(PARTICLE_COUNT, SPHERE_RADIUS);
    const currentPositions = new Float32Array(basePositions);

    const sphereGroup = new THREE.Group();
    scene.add(sphereGroup);

    // Single shared geometry — both core and glow Points reference it.
    // Updates to position propagate to both layers in one buffer write.
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(currentPositions, 3));

    const coreMat = new THREE.PointsMaterial({
      size: STATE_CFG.idle.particleSize,
      color: STATE_CFG.idle.color,
      map: tex,
      alphaMap: tex,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const core = new THREE.Points(geom, coreMat);
    sphereGroup.add(core);

    const glowMat = new THREE.PointsMaterial({
      size: 0.08,
      color: STATE_CFG.idle.color,
      map: tex,
      alphaMap: tex,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const glow = new THREE.Points(geom, glowMat);
    sphereGroup.add(glow);

    // ---- live state config (GSAP-tweened)
    const liveCfg = {
      rotateSpeed: STATE_CFG.idle.rotateSpeed,
      particleSize: STATE_CFG.idle.particleSize,
    };

    let lastState: OmegaState = "idle";
    function applyState(s: OmegaState) {
      if (s === lastState) return;
      lastState = s;
      const target = STATE_CFG[s];
      gsap.to(liveCfg, {
        rotateSpeed: target.rotateSpeed,
        particleSize: target.particleSize,
        duration: 0.8,
        ease: "power2.out",
      });
      const fromColor = new THREE.Color(coreMat.color.getHex());
      const toColor = new THREE.Color(target.color);
      const tweenObj = { t: 0 };
      gsap.to(tweenObj, {
        t: 1,
        duration: 0.8,
        ease: "power2.out",
        onUpdate: () => {
          const c = fromColor.clone().lerp(toColor, tweenObj.t);
          coreMat.color.copy(c);
          glowMat.color.copy(c);
        },
      });
    }
    applyState(state);

    // ---- interaction
    // Mouse follow uses NDC unprojected to a plane at z≈0
    const mouseNDC = new THREE.Vector2(10, 10); // outside influence by default
    const mouseTarget = new THREE.Vector3(10, 10, 0);

    const onMouseMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };
    const onMouseLeave = () => {
      mouseNDC.set(10, 10);
    };

    // Drag-to-rotate
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const onPointerDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      sphereGroup.rotation.y += dx * 0.005;
      sphereGroup.rotation.x += dy * 0.005;
    };
    const onPointerUp = () => {
      dragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camera.position.z = Math.max(4, Math.min(12, camera.position.z + e.deltaY * 0.005));
    };

    const onResize = () => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };

    renderer.domElement.style.touchAction = "none";
    window.addEventListener("mousemove", onMouseMove);
    renderer.domElement.addEventListener("mouseleave", onMouseLeave);
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("resize", onResize);

    // ---- animation loop
    let frameId = 0;
    let lastT = performance.now();
    let t = 0;
    let prevState: OmegaState = state;
    const tempVec = new THREE.Vector3();

    const animate = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastT) / 1000);
      lastT = now;
      t += dt;

      // sync state
      if (stateRef.current !== prevState) {
        applyState(stateRef.current);
        prevState = stateRef.current;
      }

      // unproject mouse NDC to a 3D point on the z=0 plane
      tempVec.set(mouseNDC.x, mouseNDC.y, 0.5);
      tempVec.unproject(camera);
      const dir = tempVec.sub(camera.position).normalize();
      const dist = -camera.position.z / dir.z;
      mouseTarget.copy(camera.position).add(dir.multiplyScalar(dist));

      // mouse-follow + return-to-base for every particle
      const radius = MOUSE_INFLUENCE;
      const radius2 = radius * radius;
      const pos = geom.attributes.position as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const ix = i * 3;
        const iy = ix + 1;
        const iz = ix + 2;
        const px = arr[ix];
        const py = arr[iy];
        const pz = arr[iz];

        const dx = mouseTarget.x - px;
        const dy = mouseTarget.y - py;
        const dz = mouseTarget.z - pz;
        const d2 = dx * dx + dy * dy + dz * dz;

        if (d2 < radius2) {
          const dlen = Math.sqrt(d2);
          const falloff = 1 - dlen / radius;
          const pull = falloff * falloff * MOUSE_PULL;
          arr[ix] += dx * pull;
          arr[iy] += dy * pull;
          arr[iz] += dz * pull;
        }

        // damping return to base position
        arr[ix] += (basePositions[ix] - arr[ix]) * DAMPING_RETURN;
        arr[iy] += (basePositions[iy] - arr[iy]) * DAMPING_RETURN;
        arr[iz] += (basePositions[iz] - arr[iz]) * DAMPING_RETURN;
      }
      pos.needsUpdate = true;

      // ambient rotation + breathing scale
      if (!dragging) {
        sphereGroup.rotation.y += liveCfg.rotateSpeed * dt * 60;
      }
      const breath = 1 + Math.sin(t * 0.8) * 0.02;
      sphereGroup.scale.setScalar(breath);

      // size tween
      coreMat.size = liveCfg.particleSize;
      glowMat.size = liveCfg.particleSize * 3.2;

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);

    // ---- cleanup
    return () => {
      cancelAnimationFrame(frameId);
      gsap.killTweensOf(liveCfg);

      window.removeEventListener("mousemove", onMouseMove);
      renderer.domElement.removeEventListener("mouseleave", onMouseLeave);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onResize);

      geom.dispose();
      coreMat.dispose();
      glowMat.dispose();
      tex.dispose();

      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} className={className} />;
}
