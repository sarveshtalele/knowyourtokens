import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import App from './App';
import { FAQ } from './components/Rest';

export function render(): string {
  return renderToString(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

// FAQPage structured data, built from the same questions the page shows.
export function faqJsonLd(): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  }).replace(/</g, '\\u003c');
}
