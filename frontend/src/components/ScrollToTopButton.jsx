import React, { useState, useEffect, useRef } from 'react';
import { ChevronsUp } from 'lucide-react';

/**
 * ScrollToTopButton
 * Premium floating 3D action button with scroll percentage and
 * silky smooth scroll-to-top using requestAnimationFrame easing.
 */
export default function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);
  const [scrollPercent, setScrollPercent] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
        const shouldShow = scrollY > 240;
        const percent = totalHeight > 0 ? Math.round((scrollY / totalHeight) * 100) : 0;
        setVisible((current) => current === shouldShow ? current : shouldShow);
        setScrollPercent((current) => current === percent ? current : percent);
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const scrollToTop = () => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  if (!visible) return null;

  return (
    <div
      className="scroll-top-widget fixed z-40"
    >
      {/* SVG arc progress ring */}
      <button
        type="button"
        onClick={scrollToTop}
        aria-label={`Back to top. Page scroll progress ${scrollPercent}%`}
        title={`Back to top · ${scrollPercent}% scrolled`}
        className="scroll-top-button group relative flex h-12 w-12 flex-col items-center justify-center rounded-full"
      >
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full -rotate-90"
          viewBox="0 0 56 56"
        >
          <circle
            cx="28" cy="28" r="24"
            fill="none"
            stroke="rgba(255,255,255,0.28)"
            strokeWidth="3"
          />
          <circle
            cx="28" cy="28" r="24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 24}`}
            strokeDashoffset={`${2 * Math.PI * 24 * (1 - scrollPercent / 100)}`}
          />
        </svg>
        <ChevronsUp aria-hidden="true" className="h-5 w-5 text-white stroke-[2.5]" />
        <span aria-hidden="true" className="font-mono text-[9px] font-bold leading-none text-orange-100">
          {scrollPercent}%
        </span>
      </button>
    </div>
  );
}
