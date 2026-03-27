import React, { useMemo } from 'react';

interface Star {
  id: number;
  top: string;
  left: string;
  size: number;
  opacity: number;
  blur: number;
  duration: number;
  delay: number;
}

export const StarsBackground: React.FC = () => {
  const stars = useMemo(() => {
    const starCount = 40; // Even fewer stars as requested
    const generatedStars: Star[] = [];
    
    for (let i = 0; i < starCount; i++) {
      generatedStars.push({
        id: i,
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        size: Math.random() * 1.5 + 0.5, // Smaller: 0.5px to 2px
        opacity: Math.random() * 0.2 + 0.05, // Much dimmer (5% to 25%)
        blur: Math.random() * 1, // Slightly blurred
        duration: Math.random() * 4 + 3, // Slower twinkle
        delay: Math.random() * 5,
      });
    }
    
    return generatedStars;
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full bg-white animate-pulse"
          style={{
            top: star.top,
            left: star.left,
            width: `${star.size}px`,
            height: `${star.size}px`,
            opacity: star.opacity,
            filter: `blur(${star.blur}px)`,
            animationDuration: `${star.duration}s`,
            animationDelay: `${star.delay}s`,
          }}
        />
      ))}
    </div>
  );
};
