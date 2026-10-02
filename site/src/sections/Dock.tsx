import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';

type OS = 'mac' | 'windows' | 'linux';

const COPY: Record<OS, { label: string; cmd: string; pin: string }> = {
  mac: {
    label: 'macOS',
    cmd: 'tokentelemetry shortcut --dock',
    pin: 'Creates “Token Telemetry.app” in ~/Applications and adds it to your Dock.',
  },
  windows: {
    label: 'Windows',
    cmd: 'tokentelemetry shortcut',
    pin: 'Adds it to the Start Menu and Desktop. Right-click → Pin to taskbar.',
  },
  linux: {
    label: 'Linux',
    cmd: 'tokentelemetry shortcut',
    pin: 'Adds an app-launcher entry and a Desktop icon. Right-click → Add to Favorites.',
  },
};

// Generic placeholder "apps" around ours: deliberately abstract shapes, not real brands.
const NEIGHBOURS = ['#5ac8fa', '#34c759', '#ff9f0a', '#ff375f', '#bf5af2', '#64d2ff'];

export function Dock() {
  const [os, setOs] = useState<OS>('mac');
  const icon = `${import.meta.env.BASE_URL}icon-192.png`;
  return (
    <section className="dock-section" id="app" aria-labelledby="dock-title">
      <div className="wrap2">
        <p className="kicker2">Lives where your apps live</p>
        <h2 id="dock-title" className="headline">
          One click from your Dock. <span className="muted">Or taskbar. Or launcher.</span>
        </h2>
        <p className="lede2">
          Install the dashboard as an app straight from the browser (“Install app” in the top bar), or let the CLI
          create a native launcher with its own icon.
        </p>
        <div className="seg" role="tablist" aria-label="Operating system">
          {(Object.keys(COPY) as OS[]).map((k) => (
            <button key={k} role="tab" type="button" aria-selected={os === k} onClick={() => setOs(k)}>
              {os === k && <motion.span layoutId="seg-pill" className="seg-pill" />}
              <span>{COPY[k].label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="wrap2">
        <div className={`desk desk-${os}`}>
          <div className="desk-wall" aria-hidden="true" />
          <AnimatePresence mode="wait">
            <motion.div
              key={os}
              className={`bar bar-${os}`}
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 160, damping: 20 }}
            >
              {os === 'windows' && <span className="bar-start" aria-hidden="true" />}
              {NEIGHBOURS.slice(0, os === 'mac' ? 6 : 4).map((c, i) => (
                <span key={c} className="bar-app" style={{ background: c, opacity: 0.85 - i * 0.05 }} aria-hidden="true" />
              ))}
              <motion.img
                src={icon}
                alt="Token Telemetry app icon"
                className="bar-ours"
                initial={{ y: -160, scale: 1.6, opacity: 0 }}
                animate={{ y: [-160, 0, -26, 0, -10, 0], scale: [1.6, 1, 1, 1, 1, 1], opacity: 1 }}
                transition={{ duration: 1.6, times: [0, 0.45, 0.6, 0.75, 0.88, 1], delay: 0.3 }}
                whileHover={{ y: -10, scale: 1.18 }}
              />
              {os === 'mac' && <span className="bar-dot" aria-hidden="true" />}
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="dock-cmd">
          <code className="mono">$ {COPY[os].cmd}</code>
          <p>{COPY[os].pin}</p>
        </div>
      </div>
    </section>
  );
}
