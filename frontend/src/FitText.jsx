import { useLayoutEffect, useRef } from 'react';

export default function FitText({ className = '', watch, children }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const fit = () => {
      el.style.fontSize = ''; // back to the size in styles.css
      if (el.scrollWidth > el.clientWidth + 1) {
        const size = parseFloat(window.getComputedStyle(el).fontSize);
        el.style.fontSize = `${Math.floor(size * (el.clientWidth / el.scrollWidth) * 0.98)}px`;
      }
    };

    fit();
    window.addEventListener('resize', fit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    return () => window.removeEventListener('resize', fit);
  }, [watch]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
