import { useEffect, useRef } from "react";
import * as THREE from "three";
import gsap from "gsap";

export type OmegaState = "idle" | "listening" | "thinking" | "speaking";

export interface NeuralBrainProps {
  state: OmegaState;
  onMicClick?: () => void;
  className?: string;
}

interface Region {
  name: string;
  count: number;
  color: number;
  pos: [number, number, number];
  r: number;
  fire: number;
}

const REGIONS: Region[] = [
  { name: "PREFRONTAL",     count: 480, color: 0xfbbf24, pos: [0.0,  1.7,  0.3], r: 0.55, fire: 0.42 },
  { name: "CONCEPT LAYER",  count: 540, color: 0xffd700, pos: [-1.7, 0.7,  0.0], r: 0.6,  fire: 0.38 },
  { name: "MOTOR CORTEX",   count: 420, color: 0xff8c42, pos: [1.7,  0.7,  0.1], r: 0.55, fire: 0.51 },
  { name: "SENSORY CORTEX", count: 480, color: 0x22d3ee, pos: [1.7,  -0.7, 0.0], r: 0.55, fire: 0.45 },
  { name: "ASSOCIATION",    count: 600, color: 0x10b981, pos: [0.0,  0.0,  1.3], r: 0.65, fire: 0.36 },
  { name: "FEATURE LAYER",  count: 480, color: 0xa78bfa, pos: [-1.7, -0.7, 0.0], r: 0.6,  fire: 0.48 },
  { name: "HIPPOCAMPUS",    count: 360, color: 0xf87171, pos: [-0.7, -1.7, 0.3], r: 0.5,  fire: 0.55 },
  { name: "LANGUAGE",       count: 420, color: 0x60a5fa, pos: [0.8,  -1.7, 0.0], r: 0.55, fire: 0.43 },
];

export const NEURAL_REGIONS = REGIONS;

interface StateConfig {
  rotateSpeed: number;
  particleSpeed: number;
  flowSpeed: number;
  intensity: number;
  brainColor: number;
  lightningRate: number;
}

const STATE_CONFIG: Record<OmegaState, StateConfig> = {
  idle:      { rotateSpeed: 0.0008, particleSpeed: 1.0, flowSpeed: 1.0, intensity: 1.0, brainColor: 0x1e40af, lightningRate: 0.3 },
  listening: { rotateSpeed: 0.0006, particleSpeed: 1.4, flowSpeed: 1.5, intensity: 1.3, brainColor: 0x0e7490, lightningRate: 0.5 },
  thinking:  { rotateSpeed: 0.001,  particleSpeed: 2.4, flowSpeed: 3.0, intensity: 2.0, brainColor: 0x6d28d9, lightningRate: 1.5 },
  speaking:  { rotateSpeed: 0.0012, particleSpeed: 1.8, flowSpeed: 1.8, intensity: 1.6, brainColor: 0x047857, lightningRate: 0.8 },
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

function noise3(x: number, y: number, z: number): number {
  return (
    Math.sin(x * 1.7 + y * 2.3 + z * 1.1) * 0.5 +
    Math.sin(x * 3.1 - y * 1.4 + z * 2.6) * 0.3 +
    Math.sin(x * 0.6 + y * 4.2 - z * 0.9) * 0.2
  );
}

function makeBrainGeometry(detail: number): THREE.IcosahedronGeometry {
  const geom = new THREE.IcosahedronGeometry(0.7, detail);
  const pos = geom.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = noise3(v.x * 1.6, v.y * 1.8, v.z * 1.4);
    const n2 = noise3(v.x * 3.2 + 5, v.y * 2.7 + 3, v.z * 3.8 + 7);
    const displace = 0.32 * n + 0.14 * n2;
    v.multiplyScalar(1 + displace);
    v.x *= 1.1;
    v.y *= 0.95;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geom.computeVertexNormals();
  return geom;
}

function pickVertex(geom: THREE.BufferGeometry): THREE.Vector3 {
  const pos = geom.attributes.position;
  const i = Math.floor(Math.random() * pos.count);
  return new THREE.Vector3().fromBufferAttribute(pos, i);
}

export function NeuralBrain({ state, onMicClick, className }: NeuralBrainProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<OmegaState>(state);
  const onMicClickRef = useRef(onMicClick);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    onMicClickRef.current = onMicClick;
  }, [onMicClick]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // ---- scene + renderer
    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 6);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // ---- shared
    const particleTex = makeRoundParticleTexture();

    // ---- brain group
    const brainGroup = new THREE.Group();
    scene.add(brainGroup);

    // brain core (deformed mesh, additive)
    const brainGeom = makeBrainGeometry(4);
    const brainCoreMat = new THREE.MeshBasicMaterial({
      color: STATE_CONFIG.idle.brainColor,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const brainCore = new THREE.Mesh(brainGeom, brainCoreMat);
    brainGroup.add(brainCore);

    // wireframe pass
    const brainWireGeom = makeBrainGeometry(4);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.55,
      wireframe: true,
      depthWrite: false,
    });
    const brainWire = new THREE.Mesh(brainWireGeom, wireMat);
    brainWire.scale.setScalar(1.02);
    brainGroup.add(brainWire);

    // inner pulse
    const innerGeom = makeBrainGeometry(3);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const innerPulse = new THREE.Mesh(innerGeom, innerMat);
    innerPulse.scale.setScalar(0.78);
    brainGroup.add(innerPulse);

    // halo
    const haloGeom = new THREE.SphereGeometry(1.1, 32, 32);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.06,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const halo = new THREE.Mesh(haloGeom, haloMat);
    brainGroup.add(halo);

    // ---- surface sparkles (white round particles on brain vertices)
    const SPARKLE_COUNT = 800;
    const sparklePositions = new Float32Array(SPARKLE_COUNT * 3);
    for (let i = 0; i < SPARKLE_COUNT; i++) {
      const v = pickVertex(brainGeom);
      sparklePositions[i * 3] = v.x;
      sparklePositions[i * 3 + 1] = v.y;
      sparklePositions[i * 3 + 2] = v.z;
    }
    const sparkleGeom = new THREE.BufferGeometry();
    sparkleGeom.setAttribute("position", new THREE.BufferAttribute(sparklePositions, 3));
    const sparkleMat = new THREE.PointsMaterial({
      size: 0.05,
      map: particleTex,
      alphaMap: particleTex,
      color: 0xffffff,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const sparkles = new THREE.Points(sparkleGeom, sparkleMat);
    brainGroup.add(sparkles);

    // ---- regions (each: bright core + soft halo)
    interface RegionGroup {
      core: THREE.Points;
      halo: THREE.Points;
      coreMat: THREE.PointsMaterial;
      haloMat: THREE.PointsMaterial;
      basePositions: Float32Array;
      phases: Float32Array;
      def: Region;
    }
    const regionGroups: RegionGroup[] = [];
    REGIONS.forEach((def) => {
      const positions = new Float32Array(def.count * 3);
      const phases = new Float32Array(def.count);
      for (let i = 0; i < def.count; i++) {
        const u = Math.random();
        const r = def.r * Math.pow(u, 0.45);
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        positions[i * 3] = def.pos[0] + r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = def.pos[1] + r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = def.pos[2] + r * Math.cos(phi);
        phases[i] = Math.random() * Math.PI * 2;
      }
      const baseCopy = new Float32Array(positions);
      const geom = new THREE.BufferGeometry();
      geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));

      const coreMat = new THREE.PointsMaterial({
        size: 0.06,
        map: particleTex,
        alphaMap: particleTex,
        color: def.color,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      });
      const haloMat = new THREE.PointsMaterial({
        size: 0.18,
        map: particleTex,
        alphaMap: particleTex,
        color: def.color,
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      });

      const core = new THREE.Points(geom, coreMat);
      const haloPoints = new THREE.Points(geom, haloMat);
      brainGroup.add(haloPoints);
      brainGroup.add(core);

      regionGroups.push({
        core,
        halo: haloPoints,
        coreMat,
        haloMat,
        basePositions: baseCopy,
        phases,
        def,
      });
    });

    // ---- vein pathways (28 cubic-bezier curves, 50 particles each)
    const VEIN_COUNT = 28;
    const PARTICLES_PER_VEIN = 50;
    interface Vein {
      curve: THREE.CubicBezierCurve3;
      progress: Float32Array;
      points: THREE.Points;
      halo: THREE.Points;
      pointsGeom: THREE.BufferGeometry;
      haloGeom: THREE.BufferGeometry;
      vesselLine: THREE.Line;
      pointsMat: THREE.PointsMaterial;
      haloMat: THREE.PointsMaterial;
      vesselMat: THREE.LineBasicMaterial;
      color: number;
    }
    const veins: Vein[] = [];
    for (let v = 0; v < VEIN_COUNT; v++) {
      const a = REGIONS[Math.floor(Math.random() * REGIONS.length)];
      let b = REGIONS[Math.floor(Math.random() * REGIONS.length)];
      while (b === a) b = REGIONS[Math.floor(Math.random() * REGIONS.length)];

      const start = new THREE.Vector3(...a.pos);
      const end = new THREE.Vector3(...b.pos);
      const mid1 = start.clone().lerp(end, 0.33).add(new THREE.Vector3(
        (Math.random() - 0.5) * 1.4,
        (Math.random() - 0.5) * 1.4,
        (Math.random() - 0.5) * 1.4,
      ));
      const mid2 = start.clone().lerp(end, 0.66).add(new THREE.Vector3(
        (Math.random() - 0.5) * 1.4,
        (Math.random() - 0.5) * 1.4,
        (Math.random() - 0.5) * 1.4,
      ));
      const curve = new THREE.CubicBezierCurve3(start, mid1, mid2, end);

      // vessel line
      const vesselPoints = curve.getPoints(40);
      const vesselGeom = new THREE.BufferGeometry().setFromPoints(vesselPoints);
      const vesselMat = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.07,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const vesselLine = new THREE.Line(vesselGeom, vesselMat);
      brainGroup.add(vesselLine);

      // particles + halo
      const positions = new Float32Array(PARTICLES_PER_VEIN * 3);
      const progress = new Float32Array(PARTICLES_PER_VEIN);
      for (let i = 0; i < PARTICLES_PER_VEIN; i++) {
        progress[i] = i / PARTICLES_PER_VEIN;
        const p = curve.getPointAt(progress[i]);
        positions[i * 3] = p.x;
        positions[i * 3 + 1] = p.y;
        positions[i * 3 + 2] = p.z;
      }
      const color = a.color;
      const pGeom = new THREE.BufferGeometry();
      pGeom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const hGeom = new THREE.BufferGeometry();
      hGeom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const pMat = new THREE.PointsMaterial({
        size: 0.07,
        map: particleTex,
        alphaMap: particleTex,
        color,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      });
      const hMat = new THREE.PointsMaterial({
        size: 0.22,
        map: particleTex,
        alphaMap: particleTex,
        color,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      });
      const points = new THREE.Points(pGeom, pMat);
      const haloPts = new THREE.Points(hGeom, hMat);
      brainGroup.add(haloPts);
      brainGroup.add(points);

      veins.push({
        curve,
        progress,
        points,
        halo: haloPts,
        pointsGeom: pGeom,
        haloGeom: hGeom,
        vesselLine,
        pointsMat: pMat,
        haloMat: hMat,
        vesselMat,
        color,
      });
    }

    // ---- lightning bolts
    interface Bolt {
      line: THREE.Line;
      mat: THREE.LineBasicMaterial;
      geom: THREE.BufferGeometry;
      lifetime: number;
      maxLife: number;
      cooldown: number;
      target: Region;
      positions: Float32Array;
    }
    const BOLT_COUNT = 6;
    const BOLT_SEGMENTS = 40;
    const bolts: Bolt[] = [];
    for (let i = 0; i < BOLT_COUNT; i++) {
      const positions = new Float32Array(BOLT_SEGMENTS * 3);
      const geom = new THREE.BufferGeometry();
      geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const line = new THREE.Line(geom, mat);
      brainGroup.add(line);
      bolts.push({
        line,
        mat,
        geom,
        lifetime: 0,
        maxLife: 0.6,
        cooldown: 1.5 + Math.random() * 3.5,
        target: REGIONS[0],
        positions,
      });
    }

    // ---- ambient drift
    const AMBIENT_COUNT = 800;
    const ambientPos = new Float32Array(AMBIENT_COUNT * 3);
    for (let i = 0; i < AMBIENT_COUNT; i++) {
      const r = 1.4 + Math.random() * 2.0;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      ambientPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      ambientPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      ambientPos[i * 3 + 2] = r * Math.cos(phi);
    }
    const ambientGeom = new THREE.BufferGeometry();
    ambientGeom.setAttribute("position", new THREE.BufferAttribute(ambientPos, 3));
    const ambientMat = new THREE.PointsMaterial({
      size: 0.04,
      map: particleTex,
      alphaMap: particleTex,
      color: 0xcbd5e1,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const ambient = new THREE.Points(ambientGeom, ambientMat);
    scene.add(ambient);

    // ---- live config (mutable, GSAP tweens this)
    const liveCfg: StateConfig = { ...STATE_CONFIG.idle };
    const liveBrainColor = { value: STATE_CONFIG.idle.brainColor };

    let lastState: OmegaState = "idle";
    const applyState = (s: OmegaState) => {
      if (s === lastState) return;
      lastState = s;
      const target = STATE_CONFIG[s];
      gsap.to(liveCfg, {
        rotateSpeed: target.rotateSpeed,
        particleSpeed: target.particleSpeed,
        flowSpeed: target.flowSpeed,
        intensity: target.intensity,
        lightningRate: target.lightningRate,
        duration: 0.8,
        ease: "power2.out",
      });
      // color tween
      const fromColor = new THREE.Color(brainCoreMat.color.getHex());
      const toColor = new THREE.Color(target.brainColor);
      const tweenObj = { t: 0 };
      gsap.to(tweenObj, {
        t: 1,
        duration: 0.8,
        ease: "power2.out",
        onUpdate: () => {
          const c = fromColor.clone().lerp(toColor, tweenObj.t);
          brainCoreMat.color.copy(c);
          liveBrainColor.value = c.getHex();
        },
      });
    };
    applyState(state);

    // ---- interaction
    let dragging = false;
    let lastX = 0,
      lastY = 0;
    let velX = 0,
      velY = 0;
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
      velX = dx * 0.005;
      velY = dy * 0.005;
      brainGroup.rotation.y += velX;
      brainGroup.rotation.x += velY;
    };
    const onPointerUp = () => {
      dragging = false;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camera.position.z = Math.max(3, Math.min(12, camera.position.z + e.deltaY * 0.005));
    };
    const onResize = () => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };

    renderer.domElement.style.touchAction = "none";
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("resize", onResize);

    // ---- animation loop
    let frameId = 0;
    let lastT = performance.now();
    let t = 0;
    let prevState = state;

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

      // auto rotate
      if (!dragging) {
        brainGroup.rotation.y += liveCfg.rotateSpeed * dt * 60;
        // damping
        velX *= 0.95;
        velY *= 0.95;
      }

      // brain inner pulse (breathing)
      const pulse = 1 + Math.sin(t * 1.4) * 0.04 * liveCfg.intensity;
      innerPulse.scale.setScalar(0.78 * pulse);
      halo.scale.setScalar(1 + Math.sin(t * 0.9) * 0.02);

      // sparkles flicker
      sparkleMat.opacity = 0.65 + Math.sin(t * 3.2) * 0.2 * liveCfg.intensity;

      // regions — jitter + firing pulse
      regionGroups.forEach((rg) => {
        const pos = rg.core.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < rg.def.count; i++) {
          const phase = rg.phases[i] + t * 1.6 * liveCfg.particleSpeed;
          const jitter = Math.sin(phase) * 0.014;
          pos.array[i * 3] = rg.basePositions[i * 3] + Math.cos(phase * 1.3) * jitter;
          pos.array[i * 3 + 1] = rg.basePositions[i * 3 + 1] + Math.sin(phase * 1.7) * jitter;
          pos.array[i * 3 + 2] = rg.basePositions[i * 3 + 2] + Math.cos(phase) * jitter;
        }
        pos.needsUpdate = true;

        const fire = 0.7 + Math.sin(t * rg.def.fire * Math.PI * 2) * 0.3 * liveCfg.intensity;
        rg.coreMat.opacity = Math.max(0.2, Math.min(1, 0.7 * fire + 0.3));
        rg.haloMat.opacity = Math.max(0.1, Math.min(0.5, 0.18 * fire + 0.12));
      });

      // veins — flow particles
      const flow = liveCfg.flowSpeed * dt * 0.3;
      veins.forEach((v) => {
        const pos = v.points.geometry.attributes.position as THREE.BufferAttribute;
        const haloPos = v.halo.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < PARTICLES_PER_VEIN; i++) {
          v.progress[i] = (v.progress[i] + flow) % 1;
          v.curve.getPointAt(v.progress[i], tempVec);
          pos.array[i * 3] = tempVec.x;
          pos.array[i * 3 + 1] = tempVec.y;
          pos.array[i * 3 + 2] = tempVec.z;
          haloPos.array[i * 3] = tempVec.x;
          haloPos.array[i * 3 + 1] = tempVec.y;
          haloPos.array[i * 3 + 2] = tempVec.z;
        }
        pos.needsUpdate = true;
        haloPos.needsUpdate = true;
      });

      // lightning bolts
      bolts.forEach((b) => {
        if (b.lifetime > 0) {
          b.lifetime -= dt;
          const lifeT = 1 - b.lifetime / b.maxLife;
          b.mat.opacity = Math.sin(lifeT * Math.PI) * 0.85;
          // jagged shape
          const start = new THREE.Vector3(0, 0, 0);
          const end = new THREE.Vector3(...b.target.pos);
          const dir = end.clone().sub(start);
          const perp = new THREE.Vector3(-dir.y, dir.x, 0).normalize();
          for (let i = 0; i < BOLT_SEGMENTS; i++) {
            const ti = i / (BOLT_SEGMENTS - 1);
            const p = start.clone().lerp(end, ti);
            const offset = Math.sin(ti * Math.PI) * 0.25 * (Math.random() - 0.5) * 2;
            p.add(perp.clone().multiplyScalar(offset));
            b.positions[i * 3] = p.x;
            b.positions[i * 3 + 1] = p.y;
            b.positions[i * 3 + 2] = p.z;
          }
          (b.geom.attributes.position as THREE.BufferAttribute).needsUpdate = true;
        } else {
          b.mat.opacity = 0;
          b.cooldown -= dt * liveCfg.lightningRate;
          if (b.cooldown <= 0) {
            const target = REGIONS[Math.floor(Math.random() * REGIONS.length)];
            b.target = target;
            b.mat.color.setHex(target.color);
            b.lifetime = b.maxLife;
            b.cooldown = 1.5 + Math.random() * 3.5;
          }
        }
      });

      // ambient drift
      const aPos = ambient.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < AMBIENT_COUNT; i++) {
        aPos.array[i * 3] += Math.sin(t * 0.15 + i) * 0.0006;
        aPos.array[i * 3 + 1] += Math.cos(t * 0.13 + i * 1.3) * 0.0006;
        aPos.array[i * 3 + 2] += Math.sin(t * 0.17 + i * 0.7) * 0.0006;
      }
      aPos.needsUpdate = true;

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);

    // ---- cleanup
    return () => {
      cancelAnimationFrame(frameId);
      gsap.killTweensOf(liveCfg);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onResize);

      // dispose region geometries (one geom per region; both core + halo Points share it)
      regionGroups.forEach((rg) => {
        rg.core.geometry.dispose();
        rg.coreMat.dispose();
        rg.haloMat.dispose();
      });
      veins.forEach((v) => {
        v.pointsGeom.dispose();
        v.haloGeom.dispose();
        v.vesselLine.geometry.dispose();
        v.pointsMat.dispose();
        v.haloMat.dispose();
        v.vesselMat.dispose();
      });
      bolts.forEach((b) => {
        b.geom.dispose();
        b.mat.dispose();
      });
      brainGeom.dispose();
      brainWireGeom.dispose();
      innerGeom.dispose();
      haloGeom.dispose();
      sparkleGeom.dispose();
      ambientGeom.dispose();
      brainCoreMat.dispose();
      wireMat.dispose();
      innerMat.dispose();
      haloMat.dispose();
      sparkleMat.dispose();
      ambientMat.dispose();
      particleTex.dispose();

      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} className={className} />;
}
