"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/Card";

// Brand & palette
const BRAND = {
  blue: "#59b8f5",
  blue600: "#2a9be0",
  blue400: "#7cc7f7",
  blue300: "#a3d8fb",
} as const;

const CLUSTERS = [
  BRAND.blue,
  "#9AA5FF",
  "#EFB4D7",
  "#F2D27A",
  "#86E0B0",
] as const;

// Simple static mock of nodes + edges (no heavy libs for homepage)
const mockMap = {
  edges: [
    // Journey 1 (cluster 0)
    ["c1", "c2"],
    ["c2", "c3"],
    ["c1", "p1"],
    // Journey 2 (cluster 1)
    ["p1", "p2"],
    ["p2", "p3"],
    ["p3", "p4"],
    // Journey 3 (cluster 2)
    ["v1", "v2"],
    ["v2", "v3"],
    ["v3", "v4"],
    // Bridge edges between journeys
    ["p1", "v1"],
    ["c3", "p1"],
  ],
  nodes: [
    // Journey 1 — Awakening Curiosity with AI (explored)
    {
      id: "c1",
      x: 25,
      y: 38,
      label: "What is ChatGPT?",
      cluster: 0,
      explored: true,
    },
    {
      id: "c2",
      x: 18,
      y: 52,
      label: "Talk to AI like a Human",
      cluster: 0,
      explored: true,
    },
    {
      id: "c3",
      x: 33,
      y: 56,
      label: "Prompt Loops",
      cluster: 0,
      explored: true,
    },

    // Journey 2 — The Language of Prompts (part explored)
    {
      id: "p1",
      x: 47,
      y: 48,
      label: "Prompt Fundamentals",
      cluster: 1,
      explored: true,
    },
    {
      id: "p2",
      x: 58,
      y: 40,
      label: "System vs User",
      cluster: 1,
      explored: false,
    },
    {
      id: "p3",
      x: 58,
      y: 56,
      label: "Iterate & Refine",
      cluster: 1,
      explored: false,
    },
    {
      id: "p4",
      x: 70,
      y: 50,
      label: "Prompt Library",
      cluster: 1,
      explored: false,
    },

    // Journey 3 — Vibe Coding (unexplored)
    {
      id: "v1",
      x: 62,
      y: 70,
      label: "Vibe Coding Intro",
      cluster: 2,
      explored: false,
    },
    {
      id: "v2",
      x: 74,
      y: 72,
      label: "Idea → First Prompt",
      cluster: 2,
      explored: false,
    },
    {
      id: "v3",
      x: 80,
      y: 60,
      label: "Task Structuring",
      cluster: 2,
      explored: false,
    },
    {
      id: "v4",
      x: 86,
      y: 72,
      label: "Debug & Review",
      cluster: 2,
      explored: false,
    },

    // Journey 4 — Working & Creating with AI (unexplored)
    {
      id: "w1",
      x: 22,
      y: 70,
      label: "AI for Work",
      cluster: 3,
      explored: false,
    },
    {
      id: "w2",
      x: 12,
      y: 62,
      label: "Creative Writing",
      cluster: 3,
      explored: false,
    },

    // Journey 5 — The Human Expansion (unexplored)
    {
      id: "h1",
      x: 40,
      y: 22,
      label: "Human in the Loop",
      cluster: 4,
      explored: false,
    },
    {
      id: "h2",
      x: 30,
      y: 16,
      label: "Digital Boundaries",
      cluster: 4,
      explored: false,
    },
  ],
} as const;

// Optimized Neural Map component
export const NeuralMapTeaser = React.memo(function NeuralMapTeaser() {
  // Pre-resolve for speed
  const byId = useMemo(
    () => Object.fromEntries(mockMap.nodes.map((n) => [n.id, n])),
    []
  );
  // State for tracking hover and active cluster
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [activeCluster, setActiveCluster] = useState<number | null>(null);

  // Pre-compute edge data to avoid recalculations during render
  const edgeData = useMemo(
    () =>
      mockMap.edges.map(([a, b], idx) => {
        const A = byId[a]!;
        const B = byId[b]!;
        const mx = (A.x + B.x) / 2 - (B.y - A.y) * 0.12;
        const my = (A.y + B.y) / 2 + (B.x - A.x) * 0.12;
        const explored = A.explored || B.explored;
        const baseColor = explored ? "url(#edgeGrad)" : "#94a3b8"; // slate-400 for unexplored
        const baseOpacity = explored ? 0.7 : 0.22;
        const width = explored ? 1 : 0.8;
        return {
          a,
          b,
          A,
          B,
          mx,
          my,
          explored,
          baseColor,
          baseOpacity,
          width,
          idx,
        };
      }),
    [byId]
  );

  // Pre-compute node rendering data with active cluster highlighting
  const nodeRenderData = useMemo(
    () =>
      mockMap.nodes.map((n, i) => {
        // Node is highlighted if it matches active cluster or is explored
        const isActive = activeCluster === n.cluster;
        // Brand blue for explored nodes, cluster color for active cluster nodes, default gray for others
        const color = isActive
          ? CLUSTERS[n.cluster]
          : n.explored
            ? BRAND.blue
            : "#94a3b8";
        const isImportant = n.explored || i < 5 || isActive;
        const nodeDelay = isImportant ? 0.03 * i : 0;
        const nodeAnimDuration = isImportant ? 0.45 : 0.2;
        const scale = isActive ? 1.5 : 1;
        return {
          n,
          i,
          color,
          isImportant,
          nodeDelay,
          nodeAnimDuration,
          isActive,
          scale,
        };
      }),
    [activeCluster]
  );

  return (
    <section className="relative">
      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* Heading + intro OUTSIDE the grid so columns align at the cards */}
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
          Your Learning Map
        </h2>
        <p className="mt-2 text-sm md:text-base text-muted-foreground max-w-prose">
          A neural map that lights up as you learn. The first five journeys help
          you feel safe, communicate clearly, create quickly, and integrate
          ethically.
        </p>

        {/* Two-column layout: left = cards (compact), right = map. Both align to top. */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-[360px_minmax(0,1fr)] gap-6 items-start">
          {/* Left rail: compact cards */}
          <div className="flex flex-col justify-between h-full space-y-2">
            {[
              {
                title: "Awakening Curiosity with AI",
                color: CLUSTERS[0],
                cluster: 0,
              },
              {
                title: "The Language of Prompts",
                color: CLUSTERS[1],
                cluster: 1,
              },
              { title: "Vibe Coding", color: CLUSTERS[2], cluster: 2 },
              {
                title: "Working & Creating with AI",
                color: CLUSTERS[3],
                cluster: 3,
              },
              { title: "The Human Expansion", color: CLUSTERS[4], cluster: 4 },
            ].map((j, i) => (
              <Card
                key={i}
                className={`rounded-xl p-0 transition-all ${activeCluster === j.cluster ? `ring-2 ring-offset-2 ring-[${j.color}]` : ""}`}
              >
                <div className="flex items-center justify-between py-2 px-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block h-2.5 w-2.5 rounded-full transition-all ${activeCluster === j.cluster ? "scale-125" : ""}`}
                      style={{ background: j.color }}
                    />
                    <span className="text-sm">{j.title}</span>
                  </div>

                  <button
                    onClick={() =>
                      setActiveCluster(
                        activeCluster === j.cluster ? null : j.cluster
                      )
                    }
                    className={`flex items-center gap-1 h-7 px-3 text-xs rounded-lg transition-colors ${activeCluster === j.cluster ? "bg-primary/10 text-primary" : "bg-gray-100 hover:bg-gray-200"}`}
                  >
                    {activeCluster === j.cluster ? "Active" : "Explore"}{" "}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </Card>
            ))}
          </div>

          {/* Right: map — align with top of first card */}
          <div className="self-start">
            <div
              className="relative rounded-3xl overflow-hidden border shadow-sm"
              style={{
                background:
                  "radial-gradient(120% 100% at 80% 0%, rgba(89,184,245,0.08), transparent 60%), radial-gradient(120% 100% at 0% 100%, rgba(89,184,245,0.06), transparent 60%), #ffffff",
              }}
            >
              {/* Subtle grid */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-60"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(15,23,42,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.04) 1px, transparent 1px)",
                  backgroundSize: "20px 20px, 20px 20px",
                }}
              />

              <svg
                viewBox="0 0 100 80"
                className="block h-[610px] w-full"
                style={{ filter: "blur(0.3px)" }}
              >
                <defs>
                  {/* Edge glow */}
                  <filter
                    id="edgeGlow"
                    x="-50%"
                    y="-50%"
                    width="200%"
                    height="200%"
                  >
                    <feGaussianBlur
                      in="SourceGraphic"
                      stdDeviation="1.2"
                      result="blur"
                    />
                    <feColorMatrix
                      in="blur"
                      type="matrix"
                      values="1 0 0 0 0
                              0 1 0 0 0
                              0 0 1 0 0
                              0 0 0 1.5 0"
                      result="glow"
                    />
                    <feMerge>
                      <feMergeNode in="glow" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  {/* Stronger glow for active elements */}
                  <filter
                    id="edgeGlowStrong"
                    x="-50%"
                    y="-50%"
                    width="200%"
                    height="200%"
                  >
                    <feGaussianBlur
                      in="SourceGraphic"
                      stdDeviation="2.5"
                      result="blur"
                    />
                    <feColorMatrix
                      in="blur"
                      type="matrix"
                      values="1 0 0 0 0
                              0 1 0 0 0
                              0 0 1 0 0
                              0 0 0 2.5 0"
                      result="glow"
                    />
                    <feMerge>
                      <feMergeNode in="glow" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  {/* Node soft blur */}
                  <filter
                    id="nodeGlow"
                    x="-50%"
                    y="-50%"
                    width="200%"
                    height="200%"
                  >
                    <feGaussianBlur stdDeviation="2.0" result="blur" />
                    <feColorMatrix
                      in="blur"
                      type="matrix"
                      values="1 0 0 0 0
                              0 1 0 0 0
                              0 0 1 0 0
                              0 0 0 2 0"
                    />
                  </filter>

                  <filter
                    id="nodeGlowEffect"
                    x="-300%"
                    y="-300%"
                    width="600%"
                    height="600%"
                  >
                    <feGaussianBlur
                      in="SourceGraphic"
                      stdDeviation="3"
                      result="blur"
                    />
                    <feColorMatrix
                      in="blur"
                      type="matrix"
                      values="1 0 0 0 0
                              0 1 0 0 0
                              0 0 1 0 0
                              0 0 0 2 0"
                      result="intensifiedBlur"
                    />
                    <feMerge>
                      <feMergeNode in="intensifiedBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  {/* Professional blue gradient for explored edges */}
                  <linearGradient
                    id="edgeGrad"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop offset="0%" stopColor={BRAND.blue300} />
                    <stop offset="50%" stopColor={BRAND.blue600} />
                    <stop offset="100%" stopColor={BRAND.blue300} />
                  </linearGradient>

                  {/* Gradients for each cluster */}
                  {CLUSTERS.map((color, i) => (
                    <radialGradient
                      key={`grad-${i}`}
                      id={`edgeGrad-${i}`}
                      cx="50%"
                      cy="50%"
                      r="70%"
                      fx="45%"
                      fy="45%"
                    >
                      <stop offset="0%" stopColor={color} stopOpacity="1" />
                      <stop offset="70%" stopColor={color} stopOpacity="0.8" />
                      <stop offset="100%" stopColor={color} stopOpacity="0.6" />
                    </radialGradient>
                  ))}
                </defs>

                {/* BACK-LAYER: faint fibers for depth - now with organic curves */}
                {edgeData.map(({ A, B, idx }) => {
                  // Create organic curves with multiple control points
                  const d = Math.sqrt(
                    Math.pow(B.x - A.x, 2) + Math.pow(B.y - A.y, 2)
                  );
                  const angle = Math.atan2(B.y - A.y, B.x - A.x) + Math.PI / 2;

                  // Control point offsets for bezier curve
                  const offset = d * 0.25;
                  const cp1x =
                    A.x +
                    (B.x - A.x) * 0.33 +
                    Math.cos(angle) * offset * (Math.random() * 0.5 + 0.5);
                  const cp1y =
                    A.y +
                    (B.y - A.y) * 0.33 +
                    Math.sin(angle) * offset * (Math.random() * 0.5 + 0.5);
                  const cp2x =
                    A.x +
                    (B.x - A.x) * 0.66 +
                    Math.cos(angle) * offset * (Math.random() * 0.5 + 0.5);
                  const cp2y =
                    A.y +
                    (B.y - A.y) * 0.66 +
                    Math.sin(angle) * offset * (Math.random() * 0.5 + 0.5);

                  // Color based on cluster with higher luminosity
                  const clusterIndex = A.cluster;
                  const hue = 50 + clusterIndex * 60; // Color based on cluster index
                  const baseColor = `hsla(${hue}, 80%, 65%, 0.4)`;

                  return (
                    <path
                      key={`fiber-${idx}`}
                      d={`M ${A.x},${A.y} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${B.x},${B.y}`}
                      stroke={baseColor}
                      strokeOpacity={0.18}
                      strokeWidth={1.5}
                      filter="url(#edgeGlow)"
                      fill="none"
                      style={{ mixBlendMode: "lighten" }}
                    />
                  );
                })}

                {/* MID-LAYER: edges with subtle signal */}
                {edgeData.map(
                  ({ A, B, idx, baseColor, baseOpacity, width, explored }) => {
                    // Check if this edge connects nodes in the active cluster
                    const isActiveEdge =
                      activeCluster !== null &&
                      A.cluster === activeCluster &&
                      B.cluster === activeCluster;
                    // Use cluster color for active edges
                    const edgeColor = isActiveEdge
                      ? `url(#edgeGrad-${activeCluster})`
                      : baseColor;
                    const edgeOpacity = isActiveEdge ? 0.9 : baseOpacity;
                    const edgeWidth = isActiveEdge ? width * 1.5 : width;

                    return (
                      <g key={`edge-${idx}`}>
                        <motion.path
                          d={`M ${A.x},${A.y} C ${A.x + (B.x - A.x) * 0.33 + Math.sin(idx) * 3},${A.y + (B.y - A.y) * 0.33 + Math.cos(idx) * 3} ${A.x + (B.x - A.x) * 0.66 + Math.cos(idx) * 3},${A.y + (B.y - A.y) * 0.66 + Math.sin(idx) * 3} ${B.x},${B.y}`}
                          stroke={edgeColor}
                          strokeOpacity={edgeOpacity * 1.2}
                          strokeWidth={edgeWidth * 1.2}
                          fill="none"
                          filter={
                            isActiveEdge
                              ? "url(#edgeGlowStrong)"
                              : "url(#edgeGlow)"
                          }
                          style={{ mixBlendMode: "screen" }}
                          initial={{ pathLength: 0 }}
                          animate={{
                            pathLength: 1,
                            strokeWidth: isActiveEdge
                              ? [width, edgeWidth, width * 1.2, edgeWidth]
                              : edgeWidth,
                          }}
                          transition={{
                            duration: isActiveEdge ? 0.8 : 1.1,
                            delay: 0.07 * (idx % 5),
                            strokeWidth: {
                              repeat: isActiveEdge ? Infinity : 0,
                              duration: isActiveEdge ? 2 : 0,
                            },
                          }}
                        />
                        {/* Always show pulse but with varying intensity */}
                        <motion.path
                          d={`M ${A.x},${A.y} C ${A.x + (B.x - A.x) * 0.33 + (B.y - A.y) * 0.05},${A.y + (B.y - A.y) * 0.33 - (B.x - A.x) * 0.05} ${A.x + (B.x - A.x) * 0.66 - (B.y - A.y) * 0.03},${A.y + (B.y - A.y) * 0.66 + (B.x - A.x) * 0.03} ${B.x},${B.y}`}
                          stroke={
                            isActiveEdge
                              ? CLUSTERS[activeCluster!]
                              : explored
                                ? BRAND.blue400
                                : `hsla(${A.cluster * 60}, 80%, 65%, 0.5)`
                          }
                          strokeOpacity={
                            isActiveEdge ? 1 : explored ? 0.8 : 0.3
                          }
                          strokeWidth={
                            isActiveEdge
                              ? width * 2
                              : explored
                                ? width * 1.2
                                : width * 0.7
                          }
                          strokeDasharray={
                            isActiveEdge ? "2 8" : explored ? "2 16" : "1 30"
                          }
                          animate={{
                            strokeDashoffset: [50, 0],
                            strokeWidth: isActiveEdge
                              ? [width * 1.6, width * 2.2, width * 1.6]
                              : explored
                                ? [width * 1.1, width * 1.3, width * 1.1]
                                : width * 0.7,
                          }}
                          style={{ mixBlendMode: "lighten" }}
                          transition={{
                            duration: isActiveEdge ? 1.2 : 2.4,
                            repeat: Infinity,
                            ease: "linear",
                            delay: 0.12 * (idx % 5),
                            strokeWidth: {
                              duration: 1.5,
                              repeat: isActiveEdge ? Infinity : 0,
                            },
                          }}
                          fill="none"
                        />
                      </g>
                    );
                  }
                )}

                {/* FORE-LAYER: nodes */}
                {nodeRenderData.map(
                  ({
                    n,
                    i,
                    color,
                    isImportant,
                    nodeDelay,
                    nodeAnimDuration,
                  }) => (
                    <g
                      key={n.id}
                      onMouseEnter={() => setHoverId(n.id)}
                      onMouseLeave={() =>
                        setHoverId((id) => (id === n.id ? null : id))
                      }
                    >
                      {/* Node glow effect - increased radius and brightness */}
                      {(n.explored || n.cluster === activeCluster) && (
                        <circle
                          cx={n.x}
                          cy={n.y}
                          r={n.cluster === activeCluster ? 6 : 4.2}
                          fill={
                            n.cluster === activeCluster
                              ? CLUSTERS[n.cluster]
                              : BRAND.blue
                          }
                          opacity={n.cluster === activeCluster ? 0.18 : 0.12}
                          filter="url(#nodeGlow)"
                        />
                      )}
                      <motion.circle
                        cx={n.x}
                        cy={n.y}
                        r={2.4}
                        fill={color}
                        initial={{ scale: 0.7, opacity: 0 }}
                        animate={{
                          scale: n.cluster === activeCluster ? 1.5 : 1.1,
                          opacity: n.cluster === activeCluster ? 1 : 0.9,
                          filter:
                            n.cluster === activeCluster
                              ? "brightness(1.5)"
                              : "brightness(1.2)",
                        }}
                        transition={{
                          duration: nodeAnimDuration,
                          delay: nodeDelay,
                        }}
                        style={{
                          filter:
                            n.cluster === activeCluster
                              ? "url(#nodeGlowEffect)"
                              : "none",
                        }}
                      />
                      {(n.explored || n.cluster === activeCluster) && (
                        <motion.circle
                          cx={n.x}
                          cy={n.y}
                          r={1.2}
                          fill={
                            n.cluster === activeCluster
                              ? CLUSTERS[n.cluster]
                              : "#ffffff"
                          }
                          opacity={n.cluster === activeCluster ? 0.9 : 0.7}
                          animate={{
                            scale: [
                              1,
                              n.cluster === activeCluster ? 1.5 : 1.3,
                              1,
                            ],
                            opacity:
                              n.cluster === activeCluster
                                ? [0.7, 1, 0.7]
                                : [0.5, 0.7, 0.5],
                          }}
                          transition={{
                            duration: n.cluster === activeCluster ? 1.5 : 2.5,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                          style={{ filter: "url(#nodeGlowEffect)" }}
                        />
                      )}
                      {isImportant && (
                        <motion.circle
                          cx={n.x + 3}
                          cy={n.y}
                          r={0.5}
                          fill={n.explored ? "#94a3b8" : "#cbd5e1"}
                          animate={{ rotate: 360 }}
                          style={{ transformOrigin: `${n.x}px ${n.y}px` }}
                          transition={{
                            duration: 7 + (i % 5),
                            repeat: Infinity,
                            ease: "linear",
                          }}
                        />
                      )}
                      <text
                        x={n.x + 1.6}
                        y={n.y - 1.4}
                        fontSize={2.6}
                        className="fill-slate-600"
                        opacity={
                          hoverId === n.id || n.cluster === activeCluster
                            ? 0.9
                            : 0.65
                        }
                        style={{
                          textShadow:
                            n.cluster === activeCluster
                              ? "0 0 3px rgba(255,255,255,0.7)"
                              : "none",
                          fontWeight:
                            n.cluster === activeCluster ? "bold" : "normal",
                        }}
                      >
                        {n.label}
                      </text>
                    </g>
                  )
                )}
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});
