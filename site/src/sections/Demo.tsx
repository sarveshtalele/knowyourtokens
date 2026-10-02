import { motion } from 'framer-motion';
import { useState } from 'react';
import { DemoApp } from '../demo/DemoApp';

export function Demo() {
  const [caption, setCaption] = useState('Every request, every project, all time. Live as you work.');
  const [playing, setPlaying] = useState(true);
  return (
    <section className="demo-section" id="demo" aria-labelledby="demo-title">
      <div className="wrap2">
        <p className="kicker2">Interactive demo</p>
        <h2 id="demo-title" className="headline">
          Take it for a spin. <span className="muted">Right here.</span>
        </h2>
        <p className="lede2">
          This is the real dashboard layout with sample data. Watch the guided tour, or click anything to take over.
        </p>
      </div>
      <motion.div
        className="wrap2 demo-stage"
        initial={{ opacity: 0, y: 60, scale: 0.97 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, margin: '-120px' }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      >
        <DemoApp
          onCaption={(c, _i, p) => {
            setCaption(c);
            setPlaying(p);
          }}
        />
        <p className={`demo-caption ${playing ? '' : 'paused'}`} aria-live="polite">
          {caption}
        </p>
      </motion.div>
    </section>
  );
}
