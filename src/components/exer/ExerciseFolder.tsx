"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/exer/card";
import { Button } from "@/components/exer/button";
import {Play,Heart,Clock,Target,Brain,Search} from "lucide-react";
import { cn } from "@/lib/utils";

interface Exercise {
  id: string;
  title: string;
  description: string;
  videoId: string;
  duration: string;
  benefits: string[];
  category: string;
}

interface ExerciseCardProps {
  exercise: Exercise;
  onPlay?: (videoId: string) => void;
}

const ExerciseCard: React.FC<ExerciseCardProps> = ({ exercise, onPlay }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handlePlay = () => {
    setIsPlaying(true);
    onPlay?.(exercise.videoId);
  };

  return (
    <Card className="group overflow-hidden border border-border bg-card hover:shadow-lg transition-all duration-300">
      <CardContent className="p-0">
        {/* Video Section */}
        <div className="relative aspect-video bg-muted">
          {isPlaying ? (
            <iframe
              src={`https://www.youtube.com/embed/${exercise.videoId}?autoplay=1`}
              title={exercise.title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <>
              <img
                src={`https://img.youtube.com/vi/${exercise.videoId}/maxresdefault.jpg`}
                alt={exercise.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  onClick={handlePlay}
                  size="lg"
                  className="rounded-full bg-white/90 text-black hover:bg-white"
                >
                  <Play className="w-6 h-6 ml-1" />
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Content Section */}
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-foreground mb-2 line-clamp-2">
                {exercise.title}
              </h3>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  {exercise.duration}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsLiked(!isLiked)}
              className="ml-2"
            >
              <Heart
                className={cn(
                  "w-5 h-5",
                  isLiked && "fill-red-500 text-red-500"
                )}
              />
            </Button>
          </div>

          {/* Description with Read More */}
          <p className="text-muted-foreground text-sm mb-4">
            <span className={expanded ? "" : "line-clamp-2"}>
              {exercise.description}
            </span>
            <button
              onClick={() => setExpanded(!expanded)}
              className="ml-2 text-blue-300 text-sm font-medium hover:underline"
            >
              {expanded ? "Read less" : "Read more"}
            </button>
          </p>

          {/* Benefits Section */}
          <div className="space-y-3">
            <h4 className="font-medium text-foreground flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Benefits
            </h4>
            <div className="grid grid-cols-1 gap-2">
              {exercise.benefits.map((benefit, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 text-sm"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  <span className="text-muted-foreground">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const MentraFolder: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const exercises: Exercise[] = [
    {
      id: "1",
      title: "Box Breathing Relaxation",
      description:
        "Inhaling fuels the body with oxygen for energy, while exhaling removes waste gas. This process keeps the brain and muscles working properly. Deep breathing also helps reduce stress and keeps you calm.",
      videoId: "oN8xV3Kb5-Q",
      duration: "5 min",
      category: "Inhale & Exhale",
      benefits: [
        "Reduces stress and anxiety",
        "Improves focus and concentration",
        "Promotes better sleep quality",
        "Enhances emotional regulation",
      ],
    },
    {
      id: "2",
      title: "Receptive Music Therapy",
      description:
        "Receptive music therapy means listening to music in a structured way chosen by a therapist to match your needs. It reduces stress, improves mood, helps express emotions, enhances relaxation, and supports healing.",
      videoId: "8Yi8u6TvODE",
      duration: "6 min",
      category: "Receptive Music Therapy",
      benefits: [
        "Releases physical tension",
        "Increases body awareness",
        "Promotes deep relaxation",
        "Helps with pain management",
      ],
    },
    {
      id: "3",
      title: "Acupressure Hand",
      description:
        "A therapy where gentle pressure is applied to specific points on the hand to relieve pain, reduce stress, and improve overall health. It’s like a natural massage that stimulates energy flow in the body.",
      videoId: "5IGPHhDZgEo",
      duration: "5 min",
     
      category: "Acupressure Hand",
      benefits: [
        "Increases self-compassion",
        "Improves relationships",
        "Reduces negative emotions",
        "Enhances empathy and kindness",
      ],
    },
    {
      id: "4",
      title: "Deep Inner Peace",
      description:
        "Meditation is a practice where you focus your mind—often on your breath, a thought, or just being aware—to calm yourself. It is useful because it reduces stress, improves concentration, helps control emotions, and supports overall mental and physical health. ",
      videoId: "ssss7V1_eyA",
      duration: "5 min",
      
      category: "Mediation",
      benefits: [
        "Combines movement with mindfulness",
        "Calms the Mind",
        "Connects you with nature",
        "Energizes the body and mind",
      ],
    },
    {
      id: "5",
      title: "Visualization for Success",
      description:
        "Disposing of a piece of paper containing your written thoughts on the cause of your anger can effectively neutralize it. This process is like a Japanese tradition called hakidashisara, in which people write their negative thoughts on a plate then destroy it.  (It helps release negative thoughts and emotions, giving a sense of relief and mental clarity). ",
      videoId: "XsHIV9PxAV4",
      duration: "6 min",
      
      category: "Expressive Writing",
      benefits: [
        "Expressive writing helps reduce stress", 
        "Improve self-awareness",
        "Process emotions",
        "And support mental well-being", 
      ],
    },
    {
      id: "6",
      title: "5-4-3-2-1 Grounding Method",
      description:
        "The 5-4-3-2-1 grounding technique is a calming method that uses your five senses to bring attention to the present moment. You notice: 5 things you see, 4 things you feel, 3 things you hear, 2 things you smell, and 1 thing you taste.",
      videoId: "30VMIEmA114 ",
      duration: "5 min",
      
      category: "5-4-3-2-1 Grounding Technique",
      benefits: [
         "Reduces stress",
         "Lifts mood",
         "Promotes deep relaxation",
        "Restores mental clarity",
      ],
    },
    {
      id: "7",
      title: "Guided Imaginary",
      description:
        "Guided imagery is a relaxation technique where you imagine peaceful scenes, places, or experiences with guidance (like a voice or script).It is useful because it reduces stress, calms the mind, improves focus, supports healing, and helps manage anxiety or pain.  ",
      videoId: "mMoCcf0Fh4s",
      
      duration: "2 min",
      
      category: "Guided Imaginary",
      benefits: [
        "Releases physical tension",
        "Fear & negative mood",
        "Promotes deep relaxation",
        
      ],
    },
    {
      id: "8",
      title: "Receptive Music Therapy",
      description:
        "Guided imagery is a relaxation technique where you imagine peaceful scenes, places, or experiences with guidance (like a voice or script).It is useful because it reduces stress, calms the mind, improves focus, supports healing, and helps manage anxiety or pain.  ",
      videoId: "-T6WA5D8h0E",
      
      duration: "20 min",
      
      category: "Receptive Music Therapy",
      benefits: [
        "Releases physical tension",
        "Increases body awareness",
        "Promotes deep relaxation",
        "Helps with pain management",
      ],
    },
    {
      id: "8",
      title: "Body Stretching",
      description:
        "Body stretching means gently extending and moving your muscles to improve flexibility and release tension.It is useful because it reduces stiffness, increases blood flow, prevents injury, and helps the body feel relaxed and energized. ",
      videoId: "DYGfwPppgO4",
      
      duration: "18 min",
      
      category: "Body Stretching",
      benefits: [
        "Releases physical tension",
        "Increases body awareness",
        "Promotes deep relaxation",
        "Helps with pain management",
      ],
    },
    {
      id: "9",
      title: "Mindful Walk",
      description:
        "Mindful walking is walking slowly and paying attention to each step, your breath, and surroundings with full awareness.It is useful because it reduces stress, improves focus, calms the mind, and connects you with the present moment. ",
      videoId: "CQkFrIdXz8k",
      duration: "3 min",
      
      category: "Mindful Walk",
      benefits: [
        "Calming the mind",
        "Increases body awareness",
        "Boosting mood",
        "Reduces stress",
      ],
    },
  ];

  const categories = ["All", ...Array.from(new Set(exercises.map((ex) => ex.category)))];

  // ✅ Filter by category + search
  const filteredExercises = exercises.filter((ex) => {
    const matchesCategory =
      selectedCategory === "All" || ex.category === selectedCategory;
    const matchesSearch =
      ex.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handlePlayVideo = (videoId: string) => {
    console.log(`Playing video: ${videoId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Folder Header */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border">
        <div className="max-w-7xl mx-auto px-5 py-5">
          <div className="flex items-center justify-between gap-4 mb-4">
            {/* Left: Logo + Title */}
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Brain className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Exercises</h1>
                <p className="text-muted-foreground">
                  Mental Training & Meditation
                </p>
              </div>
            </div>

            {/* Right: Search Bar */}
            <div className="relative w-150">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search exercises..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-8 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="max-w-7xl mx-auto px-6 py-5">
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className="rounded-full"
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      {/* Exercise Grid */}
      <div className="max-w-7xl mx-auto px-6 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExercises.map((exercise, index) => (
  <ExerciseCard
    key={'${exercise.id}-${index}'}
    exercise={exercise}
    onPlay={handlePlayVideo}
  />
))}

        </div>
        {filteredExercises.length === 0 && (
          <p className="text-center text-muted-foreground mt-10">
            No exercises found.
          </p>
        )}
      </div>
    </div>
  );
};

export default MentraFolder;