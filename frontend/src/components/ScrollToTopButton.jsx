import React, { useState, useEffect, useRef } from 'react';
import { ArrowUp, ChevronsUp } from 'lucide-react';

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
        setVisible(scrollY > 240);
        if (totalHeight > 0) {
          setScrollPercent(Math.round((scrollY / totalHeight) * 100));
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-7 right-7 z-50"
      style={{ animation: 'scaleUp 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards' }}
    >
      {/* SVG arc progress ring */}
      <div className="relative">
        <svg
          className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
          viewBox="0 0 56 56"
        >
          <circle
            cx="28" cy="28" r="24"
            fill="none"
            stroke="rgba(249,115,22,0.15)"
            strokeWidth="3"
          />
          <circle
            cx="28" cy="28" r="24"
            fill="none"
            stroke="#f97316"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 24}`}
            strokeDashoffset={`${2 * Math.PI * 24 * (1 - scrollPercent / 100)}`}
            style={{ transition: 'stroke-dashoffset 0.3s ease' }}
          />
        </svg>

        <button
          onClick={scrollToTop}
          aria-label={`Scroll to top (${scrollPercent}%)`}
          title={`Back to top — ${scrollPercent}% scrolled`}
          className="group relative flex flex-col items-center justify-center w-14 h-14 rounded-full cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, #ff9a50 0%, #f97316 40%, #ea580c 100%)',
            border: '2px solid rgba(255,255,255,0.25)',
            boxShadow: '0 6px 0 #7c2d12, 0 12px 28px -6px rgba(234,88,12,0.55), inset 0 1px 0 rgba(255,255,255,0.25)',
            transition: 'transform 0.12s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.12s cubic-bezier(0.34,1.56,0.64,1)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.boxShadow = '0 9px 0 #7c2d12, 0 18px 32px -6px rgba(234,88,12,0.65), inset 0 1px 0 rgba(255,255,255,0.3)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 6px 0 #7c2d12, 0 12px 28px -6px rgba(234,88,12,0.55), inset 0 1px 0 rgba(255,255,255,0.25)';
          }}
          onMouseDown={e => {
            e.currentTarget.style.transform = 'translateY(4px) scale(0.97)';
            e.currentTarget.style.boxShadow = '0 2px 0 #7c2d12, 0 4px 8px rgba(0,0,0,0.3)';
          }}
          onMouseUp={e => {
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.boxShadow = '0 9px 0 #7c2d12, 0 18px 32px -6px rgba(234,88,12,0.65)';
          }}
        >
          {/* Animated arrow */}
          <ChevronsUp
            className="w-5 h-5 text-white stroke-[2.5] group-hover:-translate-y-0.5 transition-transform duration-200"
          />
          <span className="text-[9px] font-black text-orange-100 tracking-widest leading-none -mt-0.5 font-mono">
            {scrollPercent}%
          </span>
        </button>
      </div>
    </div>
  );
}
