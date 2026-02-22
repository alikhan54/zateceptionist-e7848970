import { useState, useEffect } from 'react';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  formatFn?: (n: number) => string;
}

export function AnimatedNumber({ value, duration = 1000, prefix = '', suffix = '', className = '', formatFn }: AnimatedNumberProps) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const step = value / (duration / 16);
    let current = 0;
    const timer = setInterval(() => {
      current += step;
      if (current >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(Math.floor(current));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value, duration]);

  const formatted = formatFn ? formatFn(display) : display.toLocaleString();
  return <span className={className}>{prefix}{formatted}{suffix}</span>;
}
