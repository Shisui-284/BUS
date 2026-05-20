import { useEffect, useRef, useMemo } from "react";

interface Snowflake {
  id: number;
  x: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  drift: number;
}

interface SnowfallProps {
  count?: number;
}

export default function Snowfall({ count = 120 }: SnowfallProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const snowflakes = useMemo<Snowflake[]>(() => {
    const flakes: Snowflake[] = [];

    for (let i = 0; i < count; i++) {
      flakes.push({
        id: i,
        x: Math.random() * 100, // Random horizontal position (0-100%)
        size: Math.random() * 3 + 1, // Size between 1-4px
        duration: Math.random() * 10 + 15, // Fall duration 15-25s
        delay: Math.random() * 20, // Delay 0-20s
        opacity: Math.random() * 0.5 + 0.3, // Opacity 0.3-0.8
        drift: (Math.random() - 0.5) * 2, // Horizontal drift
      });
    }

    return flakes;
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    
    // Create and append snowflake elements
    snowflakes.forEach((flake) => {
      const element = document.createElement("div");
      element.className = "snowflake";
      element.style.left = `${flake.x}%`;
      element.style.width = `${flake.size}px`;
      element.style.height = `${flake.size}px`;
      element.style.opacity = String(flake.opacity);
      element.style.animationDuration = `${flake.duration}s`;
      element.style.animationDelay = `${flake.delay}s`;
      
      // Randomize snowflake appearance
      const rand = Math.random();
      if (rand < 0.7) {
        element.style.borderRadius = "50%";
        element.style.background = "rgba(255, 255, 255, 0.8)";
        element.style.boxShadow = "0 0 4px rgba(255, 255, 255, 0.4)";
      } else if (rand < 0.9) {
        element.textContent = "❄";
        element.style.fontSize = `${flake.size * 4}px`;
        element.style.color = "rgba(255, 255, 255, 0.6)";
      } else {
        element.style.borderRadius = "2px";
        element.style.background = "rgba(255, 255, 255, 0.5)";
      }

      container.appendChild(element);
    });

    // Cleanup
    return () => {
      container.innerHTML = "";
    };
  }, [snowflakes]);

  return (
    <div 
      ref={containerRef}
      className="snowfall-container"
      aria-hidden="true"
    />
  );
}
