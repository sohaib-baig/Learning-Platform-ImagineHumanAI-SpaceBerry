"use client";

import { Layer } from "@/types/classroom";
import { layerColors, layerDescriptions } from "@/lib/constants";
import { motion } from "framer-motion";

interface JourneyInfoCardProps {
  layer: Layer;
}

export function JourneyInfoCard({ layer }: JourneyInfoCardProps) {
  const colors = layerColors[layer];
  const description = layerDescriptions[layer];

  return (
    <motion.div 
      className="mb-8 p-6 rounded-xl"
      style={{ backgroundColor: colors.background }}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-3 mb-3">
      </div>
      <p className="text-slate-700">{description}</p>
    </motion.div>
  );
}
