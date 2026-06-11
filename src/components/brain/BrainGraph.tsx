/**
 * Phase F — Organization Brain: the 3D force-directed graph.
 *
 * HARD RULE — NO NODE CUTTING: total node count must be ≥
 * (1 core + 8 departments + all agentRegistry agents + the voice-tool surface
 * + all inventoried workflows). If performance tuning is ever needed, reduce
 * particle WIDTH or sprite resolution — NEVER node count. The mobile quality
 * scaler below follows this rule: it lowers particle width, node resolution
 * and label coverage only; the node set is identical on every device.
 *
 * Engine: react-force-graph-3d (the approved vasturiano engine), pinned to the
 * three@0.160-compatible line via package.json overrides — do not bump without
 * re-checking the three peer ranges (see docs/ORGANIZATION_BRAIN.md).
 */

import { useCallback, useEffect, useMemo, useRef } from "react";
import ForceGraph3D from "react-force-graph-3d";
import SpriteText from "three-spritetext";
import type { Object3D } from "three";
import {
  buildBrainGraph,
  deptName,
  type BrainDeptId,
  type BrainLink,
  type BrainNode,
} from "./brainManifest";
import type { BrainLiveCounts } from "./useBrainData";

/** Runtime node shape — manifest node + engine-assigned coordinates. */
type GNode = BrainNode & { x?: number; y?: number; z?: number };

const TYPE_LABEL: Record<BrainNode["type"], string> = {
  core: "Core Intelligence",
  department: "Department",
  agent: "AI Agent",
  workflow: "Automation",
  tool: "Voice Tool",
  live: "Live Entities",
};

const PARTICLE_SPEED = 0.0055;
const AUTO_ROTATE_SPEED = 0.55;
const AUTO_ROTATE_RESUME_MS = 6000;

interface BrainGraphProps {
  counts: BrainLiveCounts;
}

export function BrainGraph({ counts }: BrainGraphProps) {
  // react-force-graph-3d's ForceGraphMethods generic varies across versions;
  // the methods used here (d3Force/controls/cameraPosition/refresh/
  // postProcessingComposer/pauseAnimation) are all long-stable — keep it loose.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(undefined);
  const resumeTimer = useRef<number | undefined>(undefined);

  // Quality scaler (mobile) — read once on mount. NODE COUNT UNCHANGED.
  const isMobile = useMemo(
    () => window.matchMedia("(max-width: 768px)").matches,
    [],
  );

  // Build once; the engine mutates this structure (positions, object refs).
  const graphData = useMemo(() => buildBrainGraph(), []);

  // Live per-tenant counts arrive async — rename the 4 live nodes in place and
  // refresh sprites/tooltips. No graphData rebuild → simulation never reheats.
  useEffect(() => {
    const keyById: Record<string, keyof BrainLiveCounts> = {
      "live-leads": "leads",
      "live-customers": "customers",
      "live-conversations": "conversations",
      "live-appointments": "appointments",
    };
    let changed = false;
    for (const n of graphData.nodes as GNode[]) {
      const key = keyById[n.id];
      if (!key) continue;
      const base = key[0].toUpperCase() + key.slice(1);
      const c = counts[key];
      const name = c === null ? base : `${base} · ${c.toLocaleString()}`;
      if (n.name !== name) {
        n.name = name;
        changed = true;
      }
    }
    if (changed) fgRef.current?.refresh?.();
  }, [counts, graphData]);

  // One-time engine setup: forces, auto-orbit with interaction pause, bloom.
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;

    // d3 force tuning per the build contract.
    try {
      fg.d3Force("charge")?.strength(-85);
      fg.d3Force("link")?.distance((l: BrainLink) =>
        l.tier === "core" ? 160 : l.tier === "dept" ? 55 : 24,
      );
    } catch (e) {
      console.warn("[Brain] d3Force tuning skipped:", e);
    }

    // Auto-orbit; pause on user interaction, resume 6s after it ends.
    const controls = fg.controls?.();
    const onStart = () => {
      if (controls) controls.autoRotate = false;
      if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
    };
    const onEnd = () => {
      if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
      resumeTimer.current = window.setTimeout(() => {
        if (controls) controls.autoRotate = true;
      }, AUTO_ROTATE_RESUME_MS);
    };
    if (controls) {
      controls.autoRotate = true;
      controls.autoRotateSpeed = AUTO_ROTATE_SPEED;
      controls.addEventListener?.("start", onStart);
      controls.addEventListener?.("end", onEnd);
    }

    // Bloom is enhancement, not contract — any failure logs and continues.
    let bloomCancelled = false;
    (async () => {
      try {
        if (typeof fg.postProcessingComposer !== "function") {
          console.info("[Brain] bloom skipped: postProcessingComposer not exposed");
          return;
        }
        const composer = fg.postProcessingComposer();
        if (!composer?.addPass) {
          console.info("[Brain] bloom skipped: composer unavailable");
          return;
        }
        const [{ UnrealBloomPass }, { Vector2 }] = await Promise.all([
          import("three/examples/jsm/postprocessing/UnrealBloomPass.js"),
          import("three"),
        ]);
        if (bloomCancelled) return;
        const pass = new UnrealBloomPass(
          new Vector2(window.innerWidth, window.innerHeight),
          1.35, // strength
          0.55, // radius
          0.08, // threshold
        );
        composer.addPass(pass);
      } catch (e) {
        console.info("[Brain] bloom skipped:", e);
      }
    })();

    return () => {
      bloomCancelled = true;
      if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
      controls?.removeEventListener?.("start", onStart);
      controls?.removeEventListener?.("end", onEnd);
    };
  }, []);

  // Pause/dispose the engine on unmount.
  useEffect(() => {
    return () => {
      try {
        const fg = fgRef.current;
        fg?.pauseAnimation?.();
        // eslint-disable-next-line no-underscore-dangle
        fg?._destructor?.();
      } catch {
        /* dispose best-effort */
      }
    };
  }, []);

  // Labels: SpriteText on core/department/agent (mobile: core+department only).
  const nodeThreeObject = useCallback(
    (node: GNode) => {
      const labelled =
        node.type === "core" ||
        node.type === "department" ||
        node.type === "live" ||
        (!isMobile && node.type === "agent");
      if (!labelled) return undefined as unknown as object;
      if (isMobile && node.type !== "core" && node.type !== "department") {
        return undefined as unknown as object;
      }
      const sprite = new SpriteText(node.name);
      sprite.color = node.type === "core" ? "#EDE9FE" : node.color;
      sprite.fontFace = "Georgia";
      if (node.type === "core") sprite.fontWeight = "italic"; // canvas font shorthand → italic Georgia
      sprite.textHeight =
        node.type === "core"
          ? 10
          : node.type === "department"
            ? 5
            : 3.2;
      // Lift the label above the sphere (sphere radius ≈ cbrt(val) · nodeRelSize 4).
      sprite.position.y = Math.cbrt(node.val) * 4 + sprite.textHeight * 0.7;
      sprite.material.depthWrite = false;
      return sprite;
    },
    [isMobile],
  );

  const nodeLabel = useCallback((node: GNode) => {
    const dept = node.dept ? ` · ${deptName(node.dept as BrainDeptId)}` : "";
    return `<div class="brain-tip"><b>${node.name}</b><span>${TYPE_LABEL[node.type]}${dept}</span></div>`;
  }, []);

  // Camera fly-to on click (distance 110, 1400ms).
  const onNodeClick = useCallback((node: GNode) => {
    const fg = fgRef.current;
    if (!fg || node.x === undefined) return;
    const distance = 110;
    const len = Math.hypot(node.x, node.y ?? 0, node.z ?? 0) || 1;
    const ratio = 1 + distance / len;
    fg.cameraPosition(
      { x: node.x * ratio, y: (node.y ?? 0) * ratio, z: (node.z ?? 0) * ratio },
      node,
      1400,
    );
  }, []);

  const onNodeHover = useCallback((node: GNode | null) => {
    document.body.style.cursor = node ? "pointer" : "";
  }, []);

  return (
    <ForceGraph3D
      ref={fgRef}
      graphData={graphData}
      controlType="orbit"
      backgroundColor="#030509"
      showNavInfo={false}
      nodeId="id"
      nodeVal={(n: GNode) => n.val}
      nodeColor={(n: GNode) => n.color}
      nodeOpacity={0.92}
      nodeResolution={isMobile ? 8 : 12}
      nodeLabel={nodeLabel}
      // SpriteText IS a three Object3D; returning undefined = engine-default
      // sphere. The 1.24 typings don't model the undefined branch — cast once.
      nodeThreeObject={nodeThreeObject as unknown as (node: object) => Object3D}
      nodeThreeObjectExtend={true}
      linkColor={(l: BrainLink) => l.color}
      linkOpacity={0.22}
      linkWidth={(l: BrainLink) =>
        l.tier === "core" ? 1.8 : l.tier === "cross" ? 1.2 : l.tier === "dept" ? 1.0 : 0.5
      }
      linkDirectionalParticles={(l: BrainLink) => l.particles}
      linkDirectionalParticleSpeed={PARTICLE_SPEED}
      linkDirectionalParticleWidth={isMobile ? 1.0 : 1.7}
      onNodeClick={onNodeClick}
      onNodeHover={onNodeHover}
    />
  );
}
