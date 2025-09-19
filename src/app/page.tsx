'use client'
import { Navbar } from "@/components/Navbar"
import SplineSceneBasic from "@/components/demo"
import dynamic from 'next/dynamic'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#181B1C]">
      <Navbar />
      <SplineSceneBasic />
    </main>
  )
}