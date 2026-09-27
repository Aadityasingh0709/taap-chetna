import { useEffect, useRef } from 'react';

/**
 * useScrollReveal
 * Hook that triggers 'animate-scroll-fade-up' or a custom class
 * on an element once it enters the user's viewport.
 */
export function useScrollReveal(options = {}) {
  const { threshold = 0.15, rootMargin = '0px' } = options;
  const domRef = useRef(null);

  useEffect(() => {
    const currentRef = domRef.current;
    if (!currentRef) return;

    // Check if IntersectionObserver is supported
    if (!('IntersectionObserver' in window)) {
      currentRef.classList.add('animate-scroll-fade-up');
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-scroll-fade-up');
          entry.target.classList.remove('opacity-0');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold, rootMargin });

    observer.observe(currentRef);

    return () => {
      if (currentRef) observer.unobserve(currentRef);
    };
  }, [threshold, rootMargin]);

  return domRef;
}
