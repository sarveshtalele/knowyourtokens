import { useEffect, useRef } from 'react';

/**
 * Background canvas: streams of "tokens" flowing left to right along gently
 * curving lanes, drifting toward the pointer. Pauses when off-screen or the
 * tab is hidden; draws one static frame under prefers-reduced-motion.
 */
export function TokenField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pointer = { x: 0.5, y: 0.4 };
    let w = 0;
    let h = 0;
    let raf = 0;
    let visible = true;

    type P = { lane: number; x: number; speed: number; size: number; hue: number; phase: number };
    const LANES = 14;
    const particles: P[] = [];

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(160, (w * h) / 9000));
      particles.length = 0;
      for (let i = 0; i < count; i++) {
        particles.push({
          lane: Math.floor(Math.random() * LANES),
          x: Math.random() * w,
          speed: 0.25 + Math.random() * 1.1,
          size: 1 + Math.random() * 2.2,
          hue: Math.random(),
          phase: Math.random() * Math.PI * 2,
        });
      }
    }

    function laneY(lane: number, x: number, t: number) {
      const base = ((lane + 0.5) / LANES) * h;
      const bend = (pointer.y - 0.5) * 60 * Math.exp(-((x / w - pointer.x) ** 2) * 6);
      return base + Math.sin(x / 180 + lane * 0.7 + t / 2400) * 14 + bend;
    }

    function colorFor(hue: number, alpha: number) {
      // violet -> pink -> teal, matching the brand gradient
      const stops = [
        [139, 123, 255],
        [244, 114, 182],
        [45, 212, 191],
      ];
      const seg = hue * 2;
      const i = Math.min(1, Math.floor(seg));
      const f = seg - i;
      const [r, g, b] = stops[i].map((c, k) => Math.round(c + (stops[i + 1][k] - c) * f));
      return `rgba(${r},${g},${b},${alpha})`;
    }

    function frame(t: number) {
      ctx!.clearRect(0, 0, w, h);
      for (const p of particles) {
        if (!reduced) {
          p.x += p.speed;
          if (p.x > w + 20) p.x = -20;
        }
        const y = laneY(p.lane, p.x, t);
        const tail = 18 + p.speed * 26;
        const grad = ctx!.createLinearGradient(p.x - tail, y, p.x, y);
        grad.addColorStop(0, colorFor(p.hue, 0));
        grad.addColorStop(1, colorFor(p.hue, 0.55));
        ctx!.strokeStyle = grad;
        ctx!.lineWidth = p.size;
        ctx!.lineCap = 'round';
        ctx!.beginPath();
        ctx!.moveTo(p.x - tail, laneY(p.lane, p.x - tail, t));
        ctx!.lineTo(p.x, y);
        ctx!.stroke();
        ctx!.fillStyle = colorFor(p.hue, 0.9);
        ctx!.beginPath();
        ctx!.arc(p.x, y, p.size * (1.1 + 0.3 * Math.sin(t / 300 + p.phase)), 0, Math.PI * 2);
        ctx!.fill();
      }
      if (!reduced && visible) raf = requestAnimationFrame(frame);
    }

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = (e.clientX - rect.left) / rect.width;
      pointer.y = (e.clientY - rect.top) / rect.height;
    };
    const io = new IntersectionObserver(([entry]) => {
      const was = visible;
      visible = entry.isIntersecting && document.visibilityState === 'visible';
      if (visible && !was && !reduced) raf = requestAnimationFrame(frame);
    });
    const onVis = () => {
      const was = visible;
      visible = document.visibilityState === 'visible';
      if (visible && !was && !reduced) raf = requestAnimationFrame(frame);
    };

    resize();
    raf = requestAnimationFrame(frame);
    io.observe(canvas);
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return <canvas ref={ref} className="hero-canvas" aria-hidden="true" />;
}
