import { MotionConfig } from 'framer-motion';
import { Integrations } from './components/Integrations';
import { Nav } from './components/Nav';
import { Pipeline } from './components/Pipeline';
import { Faq, FinalCta, Footer, Privacy } from './components/Rest';
import { Audience } from './sections/Audience';
import { Demo } from './sections/Demo';
import { Dock } from './sections/Dock';
import { Hero } from './sections/Hero';
import { Highlights } from './sections/Highlights';
import { Install, Specs } from './sections/Install';
import { Story } from './sections/Story';

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <Nav />
      <Hero />
      <main id="main">
        <Highlights />
        <Demo />
        <Story />
        <Audience />
        <Dock />
        <Install />
        <div className="dark-band">
          <Pipeline />
          <Integrations />
        </div>
        <Privacy />
        <Specs />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </MotionConfig>
  );
}
