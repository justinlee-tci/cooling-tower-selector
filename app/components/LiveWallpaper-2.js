"use client";

import { useEffect, useRef } from "react";

export default function LiveWallpaper() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId;

    // Set canvas size
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    // Default configuration (hardcoded values)
    const backgroundColor = "#f0f4f8"; // Light blue-gray background
    const particleColor = "66, 133, 244"; // Blue raindrops in RGB format
    const particleCount = 80;
    const particleSpeed = 2; // Constant speed of falling raindrops
    const windSpeed = 0.01; // Horizontal wind effect

    // Create particle array
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height, // Start particles at random positions
        width: Math.random() * 4 + 3, // Make particles slightly wider (width range: 3 to 7)
        height: Math.random() * 10 + 10, // Raindrop height (range: 10 to 20)
        speedX: (Math.random() * 2 - 1) * windSpeed, // Random horizontal speed (wind effect)
        speedY: particleSpeed, // Constant falling speed
        color: `rgba(${particleColor}, ${Math.random() * 0.4 + 0.4})`, // Slightly stronger opacity
      });
    }

    const animate = () => {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        // Update position with constant speed
        p.x += p.speedX;
        p.y += p.speedY;

        // Bounce particles horizontally off edges of the screen
        if (p.x <= 0 || p.x >= canvas.width) p.speedX *= -1;

        // Reset particles to the top once they go off the bottom of the screen
        if (p.y >= canvas.height) {
          p.y = -p.height; // Reset to just above the canvas
          p.x = Math.random() * canvas.width; // Randomize horizontal position again
        }

        // Draw raindrop particle
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.width, p.height, 0, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full -z-10"
      style={{ pointerEvents: "none" }}
    />
  );
}
