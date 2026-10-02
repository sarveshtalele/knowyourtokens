import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { fmt } from '../../lib/format';
import { tooltipContentStyle, tooltipLabelStyle, tooltipItemStyle, axisTickStyle } from './chartTheme';

interface Props {
  data: { project: string; total_tokens: number }[];
  title?: string;
}

function truncateLabel(label: string, max = 16) {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}

export function TokenBarChart({ data, title = 'Usage by project' }: Props) {
  return (
    <div className="bg-surface border border-line rounded-lg p-4">
      <h2 className="text-sm font-bold mb-4">{title}</h2>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 60 }}>
          <XAxis
            dataKey="project"
            tick={axisTickStyle}
            angle={-40}
            textAnchor="end"
            height={80}
            interval={0}
            tickFormatter={(v: string) => truncateLabel(v)}
          />
          <YAxis tick={axisTickStyle} tickFormatter={(v) => fmt(v)} />
          <Tooltip
            formatter={(v: number) => fmt(v)}
            labelFormatter={(label: string) => label}
            contentStyle={tooltipContentStyle}
            labelStyle={tooltipLabelStyle}
            itemStyle={tooltipItemStyle}
          />
          <Bar dataKey="total_tokens" fill="#6D5EF7" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
