"use client";

import {
  Calendar,
  User,
  CheckCircle,
  Users,
  BookOpen,
} from "lucide-react";
import RadialOrbitalTimeline from "@/components/radial-orbital-timeline";
import dynamic from "next/dynamic";

const timelineData = [
  {
    id: 1,
    title: "AI Therapy Session",
    date: "Sep 2025",
    content: "Chat with AI about your stress, receive guided coping strategies.",
    category: "Therapy",
    icon: User,
    relatedIds: [2],
    status: "in-progress" as const,
    energy: 80,
  },
  {
    id: 2,
    title: "Daily Tasks",
    date: "Sep 2025",
    content: "Mood check and Brain exercise.",
    category: "Tasks",
    icon: CheckCircle,
    relatedIds: [1, 3],
    status: "pending" as const,
    energy: 50,
  },
  {
    id: 3,
    title: "Community Post",
    date: "Sep 2025",
    content: "Shared by a peer: I overcame exam stress by practicing meditation.",
    category: "Community",
    icon: Users,
    relatedIds: [2, 4],
    status: "completed" as const,
    energy: 70,
  },
  {
    id: 4,
    title: "Research Logs",
    date: "Sep 2025",
    content:
      "Anonymous user patterns show increased positive outcomes with daily journaling.",
    category: "Research",
    icon: BookOpen,
    relatedIds: [3, 5],
    status: "in-progress" as const,
    energy: 60,
  },
  {
    id: 5,
    title: "AI Agent Booking",
    date: "Sep 12, 2025",
    content: "Book your slots with AI Agent.",
    category: "Events",
    icon: Calendar,
    relatedIds: [4],
    status: "pending" as const,
    energy: 40,
  },
];

export function RadialOrbitalTimelineDemo() {
  return (
    <section className="w-full min-h-screen bg-[#181B1C] flex items-center justify-center">
      <RadialOrbitalTimeline timelineData={timelineData} />
    </section>
  );
}

export default RadialOrbitalTimelineDemo;
