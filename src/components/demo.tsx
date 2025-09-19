'use client'

import { Navbar } from "@/components/Navbar"
import { Card } from "@/components/card"
import { SplineScene } from "@/components/splite"
import RadialOrbitalTimelineDemo from "@/components/radial-timeline-demo"
import DatabaseWithRestApi from "@/components/ui/database-with-rest-api"
import { Footer } from "@/components/ui/footer-section" 
import { useRouter } from "next/navigation"; // ✅ Import router

export default function DemoPage() {
  const router = useRouter(); // Initialize router

  const handleGetStarted = () => {
    // Navigate to the SignIn page route
    router.push('/sign-in'); // ✅ Make sure /sign-in points to your sign-in page file in app/ folder
  }

  return (
    <div className="w-full min-h-screen bg-[#181B1C] relative overflow-hidden flex flex-col">
      {/* Navbar fixed at top */}
      <div className="absolute top-0 left-0 w-full z-20">
        <Navbar />
      </div>

      {/* Hero Section */}
      <Card className="w-full h-screen bg-transparent relative overflow-hidden flex pt-20">
        {/* Left content */}
        <div className="flex-1 p-12 relative z-10 flex flex-col justify-center">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[#A8DADC] via-[#EAEAEA] to-[#B0B0B0] bg-clip-text text-transparent">
            Your Mental Wellness Matters
          </h1>
          <p className="mt-5 text-white/50 max-w-xl text-lg">
            Find guidance, support, and tools to improve your mental health and
            build resilience. Discover calming resources that help you thrive.
          </p>

          <div className="mt-8 flex gap-6">
            {/* ✅ Updated Get Started Button */}
            <button
              onClick={handleGetStarted}
              className="relative px-8 py-4 rounded-xl text-lg font-semibold text-[#181B1C] 
                         bg-gradient-to-r from-[#A8DADC] to-[#457B9D] 
                         shadow-[0_0_20px_rgba(168,218,220,0.5)] 
                         transition-all duration-500 
                         hover:shadow-[0_0_30px_rgba(168,218,220,0.8)] 
                         hover:scale-105 overflow-hidden"
            >
              <span className="relative z-10 text-white">Get Started</span>
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] animate-[shimmer_2s_infinite]" />
            </button>

            <button className="px-8 py-4 rounded-lg bg-white/10 text-white border border-white/20 hover:bg-white/20 transition text-lg">
              Learn More
            </button>
          </div>
        </div>

        {/* Right content */}
        <div className="flex-1 relative h-full">
          <SplineScene
            scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
            className="w-full h-full object-contain"
          />
        </div>
      </Card>

      {/* Timeline Section */}
      <div className="mt-12">
        <RadialOrbitalTimelineDemo />
      </div>

      {/* Therapy Emotions Section */}
      <div className="relative mt-20 px-12 pb-20 overflow-hidden">
        <div className="relative grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Left Component with Moving Blue Lights */}
          <DatabaseWithRestApi
            badgeTexts={{
              first: "Sad",
              second: "Angry",
              third: "Happy",
              fourth: "Calm",
            }}
            title="Blending Emotions for Healing"
            circleText="Healing"
            buttonTexts={{
              first: "Mind & Body",
              second: "Balance",
            }}
            lightColor="#00A6F5"
          />

          {/* Right Matter Section */}
          <div className="text-white space-y-6 flex flex-col justify-center">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-[#F6E05E] via-[#FBD38D] to-[#F687B3] bg-clip-text text-transparent">
              Mind Healing Through Blended Emotions
            </h2>
            <p className="text-lg text-white/70 leading-relaxed">
              Emotions are the language of our inner self. When we blend sadness,
              anger, happiness, and calm, we create balance that leads to
              self-discovery and growth. Healing is not about avoiding emotions,
              but embracing them with compassion.
            </p>
            <p className="text-lg text-white/70 leading-relaxed">
              Life is the harmony of experiences — both light and dark. By
              understanding our emotions, we create space for peace and
              resilience. This platform is your guide to emotional clarity and
              mindful living.
            </p>
          </div>
        </div>
      </div>

      {/* Footer Section */}
      <div className="mt-auto">
        <Footer />
      </div>
    </div>
  )
}
