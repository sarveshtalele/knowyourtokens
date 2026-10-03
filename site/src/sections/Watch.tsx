import { motion } from 'framer-motion';
import { useState } from 'react';

export const YOUTUBE_ID = 'c1reSpX-c4M';
export const SHORT_ID = 'tEfAGMGZOaI';
export const YOUTUBE_URL = `https://youtu.be/${YOUTUBE_ID}`;
export const SHORT_URL = `https://youtube.com/shorts/${SHORT_ID}`;
export const PRODUCT_HUNT_URL = 'https://www.producthunt.com/products/know-your-tokens';

/**
 * A YouTube player that loads only when clicked: until then it's a local poster image, so the page stays
 * fast and nothing is requested from YouTube. The player uses the privacy-enhanced youtube-nocookie domain.
 */
function LiteYouTube({
  id,
  title,
  poster,
  vertical = false,
}: {
  id: string;
  title: string;
  poster: string;
  vertical?: boolean;
}) {
  const [on, setOn] = useState(false);
  return (
    <div className={`yt${vertical ? ' yt-vertical' : ''}`}>
      {on ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      ) : (
        <button type="button" className="yt-poster" onClick={() => setOn(true)} aria-label={`Play video: ${title}`}>
          <img src={`${import.meta.env.BASE_URL}${poster}`} alt="" loading="lazy" decoding="async" />
          <span className="yt-play" aria-hidden="true">
            <svg viewBox="0 0 68 48" width="68" height="48">
              <path
                d="M66.5 7.7a8.5 8.5 0 0 0-6-6C55.2.3 34 .3 34 .3s-21.2 0-26.5 1.4a8.5 8.5 0 0 0-6 6C.1 13 .1 24 .1 24s0 11 1.4 16.3a8.5 8.5 0 0 0 6 6C12.8 47.7 34 47.7 34 47.7s21.2 0 26.5-1.4a8.5 8.5 0 0 0 6-6C67.9 35 67.9 24 67.9 24s0-11-1.4-16.3z"
                fill="#f00"
              />
              <path d="M45 24 27 14v20" fill="#fff" />
            </svg>
          </span>
        </button>
      )}
    </div>
  );
}

export function Watch() {
  return (
    <section className="watch-section" id="watch" aria-labelledby="watch-title">
      <div className="wrap2">
        <p className="kicker2">Watch</p>
        <h2 id="watch-title" className="headline">
          See it in 2½ minutes. <span className="muted">Or 36 seconds.</span>
        </h2>
        <p className="lede2">
          A real 287,000-token request, traced back to the log file that caused it. Then a tour of everything else, from
          install to API.
        </p>
      </div>
      <motion.div
        className="wrap2 watch-grid"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        <figure className="watch-main">
          <LiteYouTube id={YOUTUBE_ID} title="Know Your Tokens: launch and setup guide" poster="watch-youtube.jpg" />
          <figcaption>
            <strong>Launch + setup guide</strong> · 2:33 ·{' '}
            <a href={YOUTUBE_URL} target="_blank" rel="noopener noreferrer">
              Open on YouTube
            </a>
          </figcaption>
        </figure>
        <div className="watch-side">
          <figure className="watch-short">
            <LiteYouTube id={SHORT_ID} title="Know Your Tokens in 36 seconds" poster="watch-short.jpg" vertical />
            <figcaption>
              <strong>The 36-second Short</strong> ·{' '}
              <a href={SHORT_URL} target="_blank" rel="noopener noreferrer">
                Open
              </a>
            </figcaption>
          </figure>
          <a className="ph-card" href={PRODUCT_HUNT_URL} target="_blank" rel="noopener noreferrer">
            <span className="ph-logo" aria-hidden="true">
              P
            </span>
            <span>
              <strong>Know Your Tokens on Product Hunt</strong>
              <small>Launching Oct 4 · Upvote and share your feedback</small>
            </span>
            <span className="ph-arrow" aria-hidden="true">
              ↗
            </span>
          </a>
        </div>
      </motion.div>
    </section>
  );
}
