"use client";

import React from "react";
import { Sparkles, Brain, Wand2, HeartHandshake } from "lucide-react";
import { Card } from "@/components/Card";

// Brand colors
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

// Pillars section - memoized to prevent unnecessary re-renders
export const Pillars = React.memo(function Pillars() {
  const items = React.useMemo(() => [
    {
      icon: Sparkles,
      title: "Learn to talk to AI",
      desc: "Turn fuzzy ideas into clear requests that land.",
      color: CLUSTERS[0],
    },
    {
      icon: Brain,
      title: "Learn to think with AI",
      desc: "Build perspective, systems, and creative reasoning.",
      color: CLUSTERS[1],
    },
    {
      icon: Wand2,
      title: "Learn to create with AI",
      desc: "Prototype fast through vibe coding and iteration.",
      color: CLUSTERS[2],
    },
    {
      icon: HeartHandshake,
      title: "Learn to become with AI",
      desc: "Grow your voice, ethics, and conscious leadership.",
      color: CLUSTERS[4],
    },
  ], []); // Empty dependency array as these items don't change

  return (
    <section className="relative">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {items.map((item, i) => (
            <Card key={i} className="rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center"
                  style={{
                    background: `${item.color}22`,
                    boxShadow: `0 0 0 1px ${item.color}33 inset`,
                  }}
                  aria-hidden
                >
                  <item.icon
                    className="h-5 w-5"
                    style={{ color: item.color }}
                  />
                </div>
                <h3 className="text-base font-medium">{item.title}</h3>
              </div>
              <div className="text-sm text-muted-foreground">
                {item.desc}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
});
