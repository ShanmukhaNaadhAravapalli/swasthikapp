"use client"

import MegaMenu, { MegaMenuItem } from "@/components/mega-menu"
import { BrainCircuit, Users, MessageCircle, Pencil , Heart,Music , BookOpen,Brain } from "lucide-react"

const navItems: MegaMenuItem[] = [
  {
    id: 1,
    label: "Therapy",
    subMenus: [
      {
        title: "Modes",
        items: [
          { label: "AI Chat", description: "Talk with an AI therapist", icon: Brain },
          { label: "Video Therapy", description: "Connect with AI Avatar", icon: MessageCircle },
          { label: "Group Support", description: "Share and heal together", icon: Users },
        ],
      },
    ],
  },
  {
    id: 2,
    label: "Resources",
    subMenus: [
      {
        title: "Guides",
        items: [
          { label: "Stress Relief", description: "Exercises to relax", icon: Music },
          { label: "Mindfulness", description: "Meditation practices", icon: Heart },
          { label: "Self-Learning", description: "Books & articles", icon: BookOpen },
        ],
      },
    ],
  },
  {
    id: 3,
    label: "Community",
    subMenus: [
      {
        title: "Engage",
        items: [
          { label: "Forums", description: "Connect with others", icon: Users },
          { label: "ContentShield", description: "Stops sensitive content", icon: Heart },
          { label: "Content Creation", description: "Personalized content recommendations ", icon: Pencil },
        ],
      },
    ],
  },
  {
    id: 4,
    label: "Wellness Tools",
    subMenus: [
      {
        title: "Daily Use",
        items: [
          { label: "Mood Tracker", description: "Track emotions daily", icon: Heart },
          { label: "Exercise", description: "Calm your mind", icon: BrainCircuit },
          { label: "Journaling", description: "Reflect & grow", icon: BookOpen },
        ],
      },
    ],
  },
  {
    id: 5,
    label: "About Us",
    subMenus: [
      {
        title: "Info",
        items: [
          { label: "Our Mission", description: "Why we exist", icon: Heart },
          { label: "Team", description: "Meet the experts", icon: Users },
          { label: "Contact", description: "Get in touch", icon: MessageCircle },
        ],
      },
    ],
  },
]

export function Navbar() {
  return (
  <nav className="absolute top-6 left-8 z-20">
    <div className="flex items-center space-x-12 text-xl">
      {/* Logo */}
      <div className="w-30 h-30 rounded-full overflow-hidden border-1 border-black">
        <img
          src="/images/logo3.jpg"
          alt="MindCare Logo"
          className="w-full h-full object-cover scale-130"
        />
      </div>

      {/* Menu */}
      <MegaMenu items={navItems} className="text-white text-xl" />
    </div>
  </nav>
);
}
