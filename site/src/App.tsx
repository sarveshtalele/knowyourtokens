import { MotionConfig } from 'framer-motion';
import { Features, Stats } from './components/Features';
import { Hero } from './components/Hero';
import { Integrations } from './components/Integrations';
import { Nav } from './components/Nav';
import { Pipeline } from './components/Pipeline';
import { Faq, FinalCta, Footer, Privacy } from './components/Rest';

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <Nav />
      <Hero />
      <main id="main">
        <Stats />
        <Features />
        <Pipeline />
        <Integrations />
        <Privacy />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </MotionConfig>
  );
}
