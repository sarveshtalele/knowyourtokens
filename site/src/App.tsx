import { MotionConfig } from 'framer-motion';
import { Integrations } from './components/Integrations';
import { Nav } from './components/Nav';
import { Pipeline } from './components/Pipeline';
import { Faq, FinalCta, Footer, Privacy } from './components/Rest';
import { Agents } from './sections/Agents';
import { Audience } from './sections/Audience';
import { Calculator } from './sections/Calculator';
import { DebugFlow } from './sections/DebugFlow';
import { Evaluate } from './sections/Evaluate';
import { Problem } from './sections/Problem';
import { Demo } from './sections/Demo';
import { Dock } from './sections/Dock';
import { Hero } from './sections/Hero';
import { Highlights } from './sections/Highlights';
import { Watch } from './sections/Watch';
import { Guide, VsCode } from './sections/Guide';
import { Install, Specs } from './sections/Install';

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
        <Agents />
        <Watch />
        <Problem />
        <Demo />
        <DebugFlow />
        <Evaluate />
        <Calculator />
        <Audience />
        <Dock />
        <Install />
        <Guide />
        <VsCode />
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
