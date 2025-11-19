"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight, Play, Pause } from "lucide-react"
import { Button } from "@/components/ui/button"

const heroImages = [
  {
    src: "/v9-tricycle.png",
    title: "V9 Electric Tricycle",
    description: "Premium electric tricycle with advanced features",
  },
  {
    src: "/t20.png",
    title: "T20 Electric Vehicle",
    description: "High-performance electric vehicle for urban mobility",
  },
  {
    src: "/cyborg.png",
    title: "Cyborg Electric Bike",
    description: "Futuristic design meets sustainable transportation",
  },
]

export default function HeroImageSlider() {
  const [currentImage, setCurrentImage] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    if (!isPlaying) return

    const timer = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % heroImages.length)
    }, 4000) // Auto slide every 4 seconds

    return () => clearInterval(timer)
  }, [isPlaying])

  const nextImage = () => {
    setCurrentImage((prev) => (prev + 1) % heroImages.length)
  }

  const prevImage = () => {
    setCurrentImage((prev) => (prev - 1 + heroImages.length) % heroImages.length)
  }

  const goToImage = (index: number) => {
    setCurrentImage(index)
  }

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  const currentImageData = heroImages[currentImage]

  return (
    <div
      className="relative w-full h-full group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="region"
      aria-label="Hero image carousel"
      aria-live="polite"
      aria-atomic="false"
    >
      {/* Screen reader announcement for current slide */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        Slide {currentImage + 1} of {heroImages.length}: {currentImageData.title}. {currentImageData.description}
      </div>

      {/* Main Images */}
      {heroImages.map((image, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
            index === currentImage ? "opacity-100 scale-100" : "opacity-0 scale-105"
          }`}
          aria-hidden={index !== currentImage}
        >
          <Image
            src={image.src || "/placeholder.svg"}
            alt={index === currentImage ? `${image.title} - ${image.description}` : ""}
            fill
            className="object-contain"
            priority={index === 0}
            sizes="(max-width: 768px) 100vw, 50vw"
            role={index === currentImage ? "img" : "presentation"}
          />
        </div>
      ))}

      {/* Logo Overlay - Smaller size for better proportion */}
      <div className="absolute top-3 left-4 z-20">
        <div className="flex items-center space-x-2 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2 shadow-lg border border-white/20">
          <div className="relative w-8 h-8 sm:w-10 sm:h-10">
            <Image
              src="/icon512_rounded.png"
              alt="YAMAARAW Electric Vehicles Logo"
              fill
              className="object-contain drop-shadow-md"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base sm:text-lg bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent leading-tight">
              YAMAARAW
            </span>
            <span className="text-xs text-gray-600 font-medium">Electric Vehicles</span>
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      <div
        className={`absolute inset-y-0 left-0 flex items-center transition-opacity duration-300 ${
          isHovered ? "opacity-100" : "opacity-0"
        }`}
      >
        <Button
          variant="ghost"
          size="lg"
          onClick={prevImage}
          className="ml-4 bg-white/80 hover:bg-white/90 backdrop-blur-sm shadow-lg border border-white/20 rounded-full w-12 h-12 p-0"
          aria-label={`Go to previous slide. Currently showing ${currentImageData.title}`}
          title="Previous slide"
        >
          <ChevronLeft className="w-6 h-6 text-gray-800" />
          <span className="sr-only">Previous slide</span>
        </Button>
      </div>

      <div
        className={`absolute inset-y-0 right-0 flex items-center transition-opacity duration-300 ${
          isHovered ? "opacity-100" : "opacity-0"
        }`}
      >
        <Button
          variant="ghost"
          size="lg"
          onClick={nextImage}
          className="mr-4 bg-white/80 hover:bg-white/90 backdrop-blur-sm shadow-lg border border-white/20 rounded-full w-12 h-12 p-0"
          aria-label={`Go to next slide. Currently showing ${currentImageData.title}`}
          title="Next slide"
        >
          <ChevronRight className="w-6 h-6 text-gray-800" />
          <span className="sr-only">Next slide</span>
        </Button>
      </div>

      {/* Play/Pause Button */}
      <div
        className={`absolute top-6 right-6 transition-opacity duration-300 ${isHovered ? "opacity-100" : "opacity-0"}`}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={togglePlayPause}
          className="bg-white/80 hover:bg-white/90 backdrop-blur-sm shadow-lg border border-white/20 rounded-full w-10 h-10 p-0"
          aria-label={isPlaying ? "Pause automatic slideshow" : "Play automatic slideshow"}
          title={isPlaying ? "Pause slideshow" : "Play slideshow"}
        >
          {isPlaying ? (
            <>
              <Pause className="w-4 h-4 text-gray-800" />
              <span className="sr-only">Pause slideshow</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 text-gray-800" />
              <span className="sr-only">Play slideshow</span>
            </>
          )}
        </Button>
      </div>

      {/* Enhanced Indicators */}
      <div
        className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-3 z-10"
        role="tablist"
        aria-label="Slide navigation"
      >
        {heroImages.map((image, index) => (
          <button
            key={index}
            onClick={() => goToImage(index)}
            className={`relative transition-all duration-300 ${
              index === currentImage
                ? "w-8 h-3 bg-white rounded-full"
                : "w-3 h-3 bg-white/60 hover:bg-white/80 rounded-full"
            }`}
            role="tab"
            aria-selected={index === currentImage}
            aria-controls={`slide-${index}`}
            aria-label={`Go to slide ${index + 1}: ${image.title}`}
            title={`Slide ${index + 1}: ${image.title}`}
            tabIndex={index === currentImage ? 0 : -1}
          >
            {index === currentImage && (
              <div
                className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-500 rounded-full animate-pulse"
                aria-hidden="true"
              />
            )}
            <span className="sr-only">
              Slide {index + 1}: {image.title}
              {index === currentImage ? " (current)" : ""}
            </span>
          </button>
        ))}
      </div>

      {/* Progress Bar */}
      {isPlaying && (
        <div
          className="absolute bottom-0 left-0 w-full h-1 bg-black/20"
          role="progressbar"
          aria-label="Slideshow progress"
          aria-valuenow={currentImage + 1}
          aria-valuemin={1}
          aria-valuemax={heroImages.length}
          aria-valuetext={`Slide ${currentImage + 1} of ${heroImages.length}`}
        >
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-100 ease-linear"
            style={{
              width: `${((Date.now() % 4000) / 4000) * 100}%`,
            }}
            aria-hidden="true"
          />
        </div>
      )}

      {/* Hidden slide content for screen readers */}
      {heroImages.map((image, index) => (
        <div
          key={`slide-content-${index}`}
          id={`slide-${index}`}
          className="sr-only"
          role="tabpanel"
          aria-labelledby={`slide-tab-${index}`}
          aria-hidden={index !== currentImage}
        >
          <h2>{image.title}</h2>
          <p>{image.description}</p>
        </div>
      ))}
    </div>
  )
}
