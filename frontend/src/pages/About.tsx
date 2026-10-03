import type { ReactNode, SVGProps } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../components/ui/Badge';
import { IconDashboard, IconWrench, IconBolt, IconPlug, IconDownload, IconMoon } from '../components/ui/Icons';
import { PageHead } from './GlobalDashboard';

export function About() {
  return (
    <div className="space-y-8 max-w-3xl">
      <PageHead
        eyebrow="Product"
        title="About Know Your Tokens"
        subtitle="A local-first observability console for AI coding agents (Claude Code, Codex CLI, Gemini CLI, OpenCode and any agent you push) — see exactly where your tokens, tool calls, and skills go, without sending any of that data anywhere but your own machine."
      />

      <Section title="What this is, in plain terms">
        <p>
          Know Your Tokens is a small program that runs on your own computer, alongside your coding agents. It quietly
          keeps a record of how each agent is being used — how many tokens each request costs, which tools and skills
          get called, which MCP servers are active, and which project each of those happened in — and shows it back to
          you in a dashboard you can search, filter, and export.
        </p>
        <p className="mt-3">
          Nothing about that record is guessed after the fact from a bill or an invoice: it is built the moment things
          actually happen, by reading the same session files each agent already writes for itself. Nothing about it is
          sent anywhere either — there is no account to sign into and no server to trust besides the one already running
          on your machine.
        </p>
      </Section>

      <Section title="What you can do with it">
        <FeatureGrid />
      </Section>

      <Section title="How it works, without the jargon">
        <ol className="space-y-3 list-none">
          <Step n={1} title="Each agent already keeps a log">
            Claude Code, Codex CLI, Gemini CLI and OpenCode all record every request's exact token usage in their own
            session files. A background process reads only what's new in them on a short timer, and catches up on
            anything it missed while it was off. Claude Code also gets live hooks, so its activity shows up instantly.
          </Step>
          <Step n={2} title="Any other agent can push">
            Agents without readable logs (Antigravity, Cursor, your own) send usage to one local endpoint,{' '}
            <span className="font-mono">POST /api/v1/ingest</span>, and are treated exactly the same.
          </Step>
          <Step n={3} title="One dashboard for all of them">
            Everything lands in one local database, and this dashboard reads from it — no agent had to be told about
            this tool, and no data left your machine.
          </Step>
        </ol>
        <p className="mt-3">
          The technical version of this — the actual database tables and data-flow diagrams — is in{' '}
          <a
            href="https://github.com/sarveshtalele/knowyourtokens/blob/main/docs/ARCHITECTURE.md"
            target="_blank"
            rel="noreferrer"
            className="text-accent-text underline underline-offset-2"
          >
            docs/ARCHITECTURE.md
          </a>
          .
        </p>
      </Section>

      <Section title="Exact vs. estimated — what “attributed” means">
        <p className="mb-3">
          Model APIs report token usage per <em>request</em>, not per file or tool call. So anywhere you see an{' '}
          <Badge tone="success">Exact</Badge> badge, that number came straight from the API. Anywhere you see an{' '}
          <Badge tone="warning">Estimated</Badge> badge — attribution hotspots, top files/paths, per-project token
          breakdowns by category — that number is a heuristic: each request's exact token count is divided across the
          tool calls active near it in the transcript, then split again across the file paths each of those tools
          touched.
        </p>
        <p>
          A slice that couldn't be matched to any nearby tool call is bucketed as{' '}
          <span className="font-mono">[unattributed]</span> rather than silently dropped or guessed. Treat estimated
          numbers as directionally useful for finding hotspots, not as a precise per-file cost.
        </p>
      </Section>

      <Section title="Full prompts and responses">
        <p>
          List views (Requests, Project → Requests) show short truncated previews for speed. Click a row, then “Open
          full prompt &amp; response” to open the complete, untruncated prompt and response for that request in its own
          page —{' '}
          <Link to="/requests" className="text-accent-text underline underline-offset-2">
            start from Requests
          </Link>
          .
        </p>
      </Section>

      <Section title="Why is “cache read” so much bigger than “input”?">
        <p className="mb-3">
          Coding agents send your entire conversation on every request (model APIs are stateless), but most of that —
          the system prompt, tool definitions, and everything said earlier in the session — is usually a prompt-cache
          hit by the second turn. The API bills that reused portion as <span className="font-mono">cache read</span>, at
          a fraction of fresh-token cost, and only counts genuinely new content as{' '}
          <span className="font-mono">input</span>. So a request showing <b>Input: 2</b> and <b>Cache read: 764,387</b>{' '}
          isn't hiding anything — that 764K really is mostly your system prompt and prior conversation, exact and fully
          accounted for, just filed under a different label than you might expect.
        </p>
        <p>
          One limitation worth naming directly: agents don't write the literal system prompt or tool definition text to
          their session logs, so this collector can't see it. So the{' '}
          <Link to="/requests" className="text-accent-text underline underline-offset-2">
            full prompt view
          </Link>{' '}
          can show you every user message and tool result that went into a request, but never the system prompt itself.
          Its exact token cost is still fully captured above — just not its content.
        </p>
      </Section>

      <Section title="What's excluded on purpose">
        <p>
          Cost/pricing columns are intentionally left out of the primary UI — billing depends on the plan in effect and
          isn't a reliable token-telemetry primitive, so it would be misleading to display it alongside exact/estimated
          token data.
        </p>
      </Section>

      <Section title="Local-first and private by design">
        <p>
          Everything runs on your machine: a Python collector + FastAPI backend on top of a local SQLite file, and this
          React UI talking to it over <span className="font-mono">/api/v1</span> — never a request outside{' '}
          <span className="font-mono">127.0.0.1</span>. See{' '}
          <Link to="/settings" className="text-accent-text underline underline-offset-2">
            Settings
          </Link>{' '}
          for the exact database path and collector status on this machine.
        </p>
        <p className="mt-3">
          Created by Sarvesh Talele and open source under the Apache 2.0 license (credit required when redistributing).
          The full source, the installation guide, and a complete security review are on{' '}
          <a
            href="https://github.com/sarveshtalele/knowyourtokens"
            target="_blank"
            rel="noreferrer"
            className="text-accent-text underline underline-offset-2"
          >
            GitHub
          </a>
          .
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-surface border border-line rounded-lg p-5">
      <h2 className="text-sm font-bold mb-2.5">{title}</h2>
      <div className="text-sm text-ink-soft leading-relaxed">{children}</div>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="shrink-0 w-6 h-6 rounded-full bg-accent-soft text-accent-text text-xs font-extrabold grid place-items-center mt-0.5">
        {n}
      </span>
      <div>
        <div className="text-ink font-semibold text-sm mb-0.5">{title}</div>
        <p>{children}</p>
      </div>
    </li>
  );
}

const FEATURES: { Icon: (props: SVGProps<SVGSVGElement>) => ReactNode; title: string; body: string }[] = [
  {
    Icon: IconDashboard,
    title: 'Token visibility',
    body: 'Every request, every project, all time by default — not capped at 30 days.',
  },
  {
    Icon: IconWrench,
    title: 'Tool & skill breakdowns',
    body: 'See which tools, skills, and MCP servers actually drive usage, per project.',
  },
  {
    Icon: IconBolt,
    title: 'Live activity',
    body: 'A live indicator and event feed reflect what your agents are doing right now.',
  },
  {
    Icon: IconPlug,
    title: 'Full trace inspection',
    body: 'Open the complete, untruncated prompt and response behind any request.',
  },
  {
    Icon: IconDownload,
    title: 'Report export',
    body: 'Download usage or project summaries as CSV or JSON for your own analysis.',
  },
  {
    Icon: IconMoon,
    title: 'Dark & light mode',
    body: 'Matches your OS preference by default, with a persistent manual toggle.',
  },
];

function FeatureGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {FEATURES.map((f) => (
        <div key={f.title} className="flex gap-3 bg-surface-muted rounded-lg p-3.5">
          <f.Icon className="text-accent-text shrink-0 mt-0.5" width={20} height={20} />
          <div>
            <div className="text-ink font-semibold text-sm">{f.title}</div>
            <div className="text-ink-soft text-xs mt-0.5">{f.body}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
