"use client";
import { useState, useEffect } from "react";

export default function LiveWallpaper() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [opacity, setOpacity] = useState(1);

  // Add your image URLs here
  const images = [
    "/public/company-logo.jpg", // Replace with your actual image paths
    "/api/placeholder/1920/1080",
    "/api/placeholder/1920/1080",
    "/api/placeholder/1920/1080",
    "/api/placeholder/1920/1080"
  ];

  // Configuration
  const slideDuration = 5000; // Time each image is displayed (in ms)
  const fadeDuration = 1000; // Fade transition duration (in ms)

  useEffect(() => {
    // Image rotation logic
    const intervalId = setInterval(() => {
      // Start fade out
      setOpacity(0);
      
      // Change image after fade out completes
      const timeout = setTimeout(() => {
        setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
        setOpacity(1); // Start fade in
      }, fadeDuration);
      
      return () => clearTimeout(timeout);
    }, slideDuration);

    return () => clearInterval(intervalId);
  }, [images.length]);

  return (
    <div className="fixed top-0 left-0 w-full h-full -z-10" style={{ pointerEvents: "none" }}>
      <div
        className="w-full h-full bg-cover bg-center"
        style={{
          backgroundImage: `url(${images[currentImageIndex]})`,
          transition: `opacity ${fadeDuration}ms ease-in-out`,
          opacity: opacity
        }}
      />
    </div>
  );
}