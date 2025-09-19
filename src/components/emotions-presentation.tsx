"use client"

import React from "react"
import { motion } from "framer-motion"
import { Smile, Frown, Angry, Heart } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmotionsProps {
  className?: string
  title?: string
  /** Small round badge text under the main box (e.g., "Feelings") */
  circleText?: string
  badgeTexts?: {
    first: string
    second: string
    third: string
    fourth: string
  }
  /** Glow color for one of the flowing particles */
  lightColor?: string
}

const EmotionsPresentation = ({
  className,
  title,
  circleText,
  badgeTexts,
  lightColor,
}: EmotionsProps) => {
  return (
    <div
      className={cn(
        "relative flex h-[380px] w-full max-w-[560px] flex-col items-center",
        className
      )}
    >
      {/* Curved flow lines */}
      <svg
        className="h-full w-full text-white/20"
        viewBox="0 0 200 120"
        stroke="currentColor"
        fill="none"
      >
        <path d="M 30 20 Q 100 60 100 90" strokeWidth="0.6" />
        <path d="M 170 20 Q 100 60 100 90" strokeWidth="0.6" />
        <path d="M 60 60 Q 100 75 100 90" strokeWidth="0.6" />
        <path d="M 140 60 Q 100 75 100 90" strokeWidth="0.6" />

        {/* Glowing particles that travel toward the center */}
        <circle r="4" fill={lightColor || "#F59E0B"}>
          <animateMotion dur="4s" repeatCount="indefinite" path="M 30 20 Q 100 60 100 90" />
        </circle>
        <circle r="4" fill="#3B82F6">
          <animateMotion dur="4s" repeatCount="indefinite" path="M 170 20 Q 100 60 100 90" />
        </circle>
        <circle r="4" fill="#EF4444">
          <animateMotion dur="4s" repeatCount="indefinite" path="M 60 60 Q 100 75 100 90" />
        </circle>
        <circle r="4" fill="#22C55E">
          <animateMotion dur="4s" repeatCount="indefinite" path="M 140 60 Q 100 75 100 90" />
        </circle>
      </svg>

      {/* Title badge */}
      <motion.div
        className="absolute -top-2 z-20 rounded-md border border-white/15 bg-[#101112] px-2 py-1 text-[11px] text-white/90"
        initial={{ y: -8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        {title || "Emotional Awareness"}
      </motion.div>

      {/* Central 'Life' box */}
      <motion.div
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex w-[72%] max-w-[380px] flex-col items-center rounded-lg border border-white/20 bg-black/40 px-6 py-4 shadow-xl backdrop-blur-lg"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        whileHover={{ scale: 1.03 }}
      >
        <h3 className="text-white text-[15px] font-semibold tracking-wide">Life</h3>
        <p className="mt-2 text-center text-[13px] leading-5 text-white/80">
          Life blends <span className="text-blue-300">Sadness</span>,{" "}
          <span className="text-yellow-300">Happiness</span>,{" "}
          <span className="text-red-300">Anger</span>, and{" "}
          <span className="text-pink-300">Calm</span> — learning to notice each
          feeling helps us respond with clarity and care.
        </p>

        {/* Small circular badge under the box (uses circleText) */}
        <div className="absolute -bottom-7 grid h-[54px] w-[54px] place-items-center rounded-full border-t border-white/20 bg-[#141516] text-[11px] font-medium text-white">
          {circleText || "Feelings"}
        </div>

        {/* Gentle concentric pulses for depth */}
        <motion.div
          className="absolute -bottom-14 h-[100px] w-[100px] rounded-full border-t border-white/10"
          animate={{ scale: [0.98, 1.02, 0.98] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <motion.div
          className="absolute -bottom-[88px] h-[140px] w-[140px] rounded-full border-t border-white/10"
          animate={{ scale: [1.02, 0.98, 1.02] }}
          transition={{ duration: 2.2, repeat: Infinity }}
        />
      </motion.div>

      {/* Emotion badges */}
      <motion.div
        className="absolute top-4 left-6 flex items-center gap-2 rounded-full border border-white/20 bg-[#101112] px-3 py-1 text-xs"
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <Frown className="size-4 text-blue-400" />
        <span>{badgeTexts?.first || "Sad"}</span>
      </motion.div>

      <motion.div
        className="absolute top-4 right-6 flex items-center gap-2 rounded-full border border-white/20 bg-[#101112] px-3 py-1 text-xs"
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <Smile className="size-4 text-yellow-300" />
        <span>{badgeTexts?.second || "Happy"}</span>
      </motion.div>

      <motion.div
        className="absolute top-[42%] left-8 flex items-center gap-2 rounded-full border border-white/20 bg-[#101112] px-3 py-1 text-xs"
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.45 }}
      >
        <Angry className="size-4 text-red-400" />
        <span>{badgeTexts?.third || "Angry"}</span>
      </motion.div>

      <motion.div
        className="absolute top-[42%] right-8 flex items-center gap-2 rounded-full border border-white/20 bg-[#101112] px-3 py-1 text-xs"
        initial={{ opacity: 0, x: 8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.55 }}
      >
        <Heart className="size-4 text-pink-400" />
        <span>{badgeTexts?.fourth || "Calm"}</span>
      </motion.div>
    </div>
  )
}

export default EmotionsPresentation
