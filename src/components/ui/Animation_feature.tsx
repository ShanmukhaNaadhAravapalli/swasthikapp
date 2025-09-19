//npm install framer-motion lucide-react clsx tailwind-merge

//src\components\ui\Animation_feature.tsx

"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";

/* Utility function like Tailwind's cn() */
function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

interface FinancialBanner {
  
  title: string;
  image: string;
  gradient: string;
}

interface FintechCarouselProps {
  banners?: FinancialBanner[];
  autoplay?: boolean;
  autoplayInterval?: number;
  showProgress?: boolean;
  showDots?: boolean;
  showArrows?: boolean;
  showPlayPause?: boolean;
  className?: string;
}

const CircleProgress = ({
  value,
  maxValue,
  size = 40,
  strokeWidth = 3,
  className,
}: {
  value: number;
  maxValue: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const fillPercentage = Math.min(value / maxValue, 1);
  const strokeDashoffset = circumference * (1 - fillPercentage);

  return (
    <div className={cn(className)}>
      <svg width={size} height={size} viewBox={'0 0 ${size} ${size}'}>
        <circle
  cx={size / 2}
  cy={size / 2}
  r={radius}
  className="fill-transparent stroke-gray-500/50"   // background ring
  strokeWidth={strokeWidth}
/>
<circle
  cx={size / 2}
  cy={size / 2}
  r={radius}
  className="fill-transparent stroke-current text-white transition-all duration-300" // progress ring
  strokeWidth={strokeWidth}
  strokeDasharray={circumference}
  strokeDashoffset={strokeDashoffset}
  transform={'rotate(-90 ${size / 2} ${size / 2})'}
  strokeLinecap="round"
/>

      </svg>
    </div>
  );
};

const defaultBanners: FinancialBanner[] = [
  {
    title: "Personal AI Assistant",
    image:
      "/images/ai-assistant.jpg",
    gradient: "from-emerald-800 to-teal-600",

  },
  {
    title: "Community Support",
    image:
      "https://as1.ftcdn.net/v2/jpg/05/36/49/46/1000_F_536494651_5LGyrJTwv2WdENVu7bQCN1WiB6hYHtSK.jpg",
    gradient: "from-blue-400 to-indigo-800",
  },
  {
    title: "Exercise",
    image:
      "https://eljacaguero.com.do/wp-content/uploads/2022/10/cerebro.jpg",
    gradient: "from-purple-500 to-pink-600",
  },
  {
    title: "AI Agent Booking",
    image:
      "https://mydesk.io/wp-content/uploads/2023/06/AI-Deskbooking.jpg",
    gradient: "from-orange-300 to-red-1000",
  },
];

export const FintechCarousel: React.FC<FintechCarouselProps> = ({
  banners = defaultBanners,
  autoplay = true,
  autoplayInterval = 5000,
  showProgress = true,
  showDots = true,
  showArrows = true,
  showPlayPause = true,
  className,
}) => {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [isPlaying, setIsPlaying] = React.useState(autoplay);
  const [progress, setProgress] = React.useState(0);
  const [touchStart, setTouchStart] = React.useState<number | null>(null);
  const [touchEnd, setTouchEnd] = React.useState<number | null>(null);

  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const progressIntervalRef =
    React.useRef<ReturnType<typeof setInterval> | null>(null);

  const minSwipeDistance = 50;

  const nextSlide = React.useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
    setProgress(0);
  }, [banners.length]);

  const prevSlide = React.useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
    setProgress(0);
  }, [banners.length]);

  const goToSlide = React.useCallback((index: number) => {
    setCurrentIndex(index);
    setProgress(0);
  }, []);

  const togglePlayPause = React.useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  // Swipe logic
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance) nextSlide();
    if (distance < -minSwipeDistance) prevSlide();
  };

  // Autoplay
  React.useEffect(() => {
    if (isPlaying && autoplay) {
      intervalRef.current = setInterval(nextSlide, autoplayInterval);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, autoplay, autoplayInterval, nextSlide]);

  // Progress
  React.useEffect(() => {
    if (isPlaying && showProgress) {
      const progressStep = 100 / (autoplayInterval / 100);
      progressIntervalRef.current = setInterval(() => {
        setProgress((prev) => (prev >= 100 ? 0 : prev + progressStep));
      }, 100);
      return () => {
        if (progressIntervalRef.current)
          clearInterval(progressIntervalRef.current);
      };
    }
    return () => {
      if (progressIntervalRef.current)
        clearInterval(progressIntervalRef.current);
    };
  }, [isPlaying, showProgress, autoplayInterval]);

  React.useEffect(() => {
    setProgress(0);
  }, [currentIndex]);

  return (
    <div
      className={cn(
        "relative w-full max-w-6xl mx-auto overflow-hidden rounded-2xl max-h-60 items-center jutify-center",
        className
      )}
    >
      {/* Carousel */}
      <div
        className="relative h-[400px] md:h-[500px]"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -300 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <div
              className={cn(
                "relative h-full w-full bg-gradient-to-br",
                banners[currentIndex].gradient
              )}
            >
              <div className="absolute inset-0">
                <img
                  src={banners[currentIndex].image}
                  alt={banners[currentIndex].title}
                  className="w-full h-60 object-contain opacity-20"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent " />
              </div>

              <div className="relative z-10 flex items-center max-h-60 p-8 md:p-12">
                <div className="max-w-2xl text-white-400">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="flex items-center gap-3 mb-4"
                  >
                   
                  </motion.div>

                  <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="text-6xl md:text-4xl font-bold mb-4"
                  >
                    {banners[currentIndex].title}
                  </motion.h2>

                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                    className="text-lg md:text-xl mb-8 opacity-90 max-w-lg"
                  >
                    
                  </motion.p>

                 
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Arrows */}
      {showArrows && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white/20 backdrop-blur-sm text-white p-1 rounded-full hover:bg-white/30"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-6 h-7" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white/20 backdrop-blur-sm text-white p-1 rounded-full hover:bg-white/30"
            aria-label="Next slide"
          >
            <ChevronRight className="w-6 h-7" />
          </button>
        </>
      )}

      {/* Bottom controls */}
      <div className="absolute bottom-6 left-0 right-0 z-20 flex items-center justify-between px-8">
        {showDots && (
          <div className="flex gap-2">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-200",
                  index === currentIndex
                    ? "bg-white scale-120"
                    : "bg-white/50 hover:bg-white/70"
                )}
                aria-label={'Go to slide ${index + 1}'}
              />
            ))}
          </div>
        )}

        <div className="flex items-center gap-4">
          {showProgress && (
            <div className="flex items-center gap-2">
              <CircleProgress
                value={progress}
                maxValue={100}
                size={32}
                strokeWidth={2}
              />
              <span className="text-white text-sm font-medium">
                {currentIndex + 1} / {banners.length}
              </span>
            </div>
          )}

          {showPlayPause && (
            <button
              onClick={togglePlayPause}
              className="bg-white/20 backdrop-blur-sm text-white p-2 rounded-full hover:bg-white/30"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/* Demo wrapper */
const FintechCarouselDemo = () => (
  <div className=" bg-background p-8 flex items-center justify-center">
    <div className="w-full ">
      

      <FintechCarousel
        autoplay
        autoplayInterval={4000}
        showProgress
        showDots
        showArrows
        showPlayPause
        className="shadow-2xl"
      />
    </div>
  </div>
);

export default FintechCarouselDemo;