import { useEffect, useRef, useState } from 'react';

export default function CountUp({
  to,
  from = 0,
  direction = 'up',
  delay = 0,
  duration = 2,
  className = '',
  startWhen = true,
  separator = '',
  onStart,
  onEnd
}) {
  const ref = useRef(null);
  const [isInView, setIsInView] = useState(false);
  const animationFrameRef = useRef(null);
  const delayTimeoutRef = useRef(null);
  const hasStartedRef = useRef(false);

  const getDecimalPlaces = num => {
    const str = num.toString();

    if (str.includes('.')) {
      const decimals = str.split('.')[1];

      if (parseInt(decimals) !== 0) {
        return decimals.length;
      }
    }

    return 0;
  };

  const maxDecimals = Math.max(getDecimalPlaces(from), getDecimalPlaces(to));

  useEffect(() => {
    if (ref.current) {
      ref.current.textContent = String(direction === 'down' ? to : from);
    }
  }, [from, to, direction]);

  useEffect(() => {
    hasStartedRef.current = false;
  }, [direction, from, to, startWhen]);

  useEffect(() => {
    if (!ref.current) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const startValue = direction === 'down' ? to : from;
    const endValue = direction === 'down' ? from : to;
    const totalDuration = Math.max(duration, 0) * 1000;

    const cancelAnimation = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };

    const formatNumber = value => {
      const hasDecimals = maxDecimals > 0;
      const options = {
        useGrouping: !!separator,
        minimumFractionDigits: hasDecimals ? maxDecimals : 0,
        maximumFractionDigits: hasDecimals ? maxDecimals : 0
      };
      const formatted = Intl.NumberFormat('en-US', options).format(value);
      return separator ? formatted.replace(/,/g, separator) : formatted;
    };

    const runAnimation = () => {
      const startTime = performance.now();

      const tick = now => {
        const elapsed = now - startTime;
        const progress = totalDuration === 0 ? 1 : Math.min(elapsed / totalDuration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const currentValue = startValue + (endValue - startValue) * eased;

        if (ref.current) {
          ref.current.textContent = formatNumber(currentValue);
        }

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(tick);
        } else {
          animationFrameRef.current = null;
          if (typeof onEnd === 'function') onEnd();
        }
      };

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    if (isInView && startWhen && !hasStartedRef.current) {
      hasStartedRef.current = true;
      if (typeof onStart === 'function') onStart();

      if (delay > 0) {
        delayTimeoutRef.current = setTimeout(() => {
          runAnimation();
        }, delay * 1000);
      } else {
        runAnimation();
      }
    }

    return () => {
      cancelAnimation();
      if (delayTimeoutRef.current) {
        clearTimeout(delayTimeoutRef.current);
        delayTimeoutRef.current = null;
      }
    };
  }, [isInView, startWhen, direction, from, to, delay, duration, separator, maxDecimals, onStart, onEnd]);

  useEffect(() => {
    return () => {
      if (delayTimeoutRef.current) {
        clearTimeout(delayTimeoutRef.current);
        delayTimeoutRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, []);

  return <span className={className} ref={ref} />;
}
