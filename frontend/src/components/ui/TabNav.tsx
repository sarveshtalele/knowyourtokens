interface Props {
  tabs: string[];
  active: string;
  onChange: (tab: string) => void;
}

export function TabNav({ tabs, active, onChange }: Props) {
  return (
    <div className="flex gap-0.5 border-b border-line mb-4">
      {tabs.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`border-0 bg-transparent px-3.5 py-2.5 text-sm font-bold border-b-2 -mb-px transition-colors ${
            active === t ? 'text-accent-text border-accent' : 'text-ink-soft border-transparent hover:text-ink'
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
