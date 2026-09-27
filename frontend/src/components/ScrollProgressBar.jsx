import React, { useState, useEffect, useRef } from 'react';

/**
 * ScrollProgressBar
 * Premium gradient progress bar with shimmer glow and smooth tip dot.
 * Uses requestAnimationFrame + passive listeners for zero jank.
 */
export default function ScrollProgressBar() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const updateProgress = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        setScrollProgress(Math.min(100, Math.max(0, (window.scrollY / totalHeight) * 100)));
      }
    };

    const handleScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updateProgress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    updateProgress(); // initial

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="scroll-progress-track">
      <div
        className="scroll-progress-fill"
        style={{ width: `${scrollProgress}%` }}
      >
        {scrollProgress > 1 && (
          <div className="scroll-progress-tip" />
        )}
      </div>
    </div>
  );
}
