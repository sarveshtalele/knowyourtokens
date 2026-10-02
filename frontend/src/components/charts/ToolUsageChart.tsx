import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { fmt } from '../../lib/format';
import { tooltipContentStyle, tooltipLabelStyle, tooltipItemStyle, axisTickStyle } from './chartTheme';

interface Props {
  data: { tool_name: string; call_count: number }[];
}

function truncateLabel(label: string, max = 14) {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}

export function ToolUsageChart({ data }: Props) {
  return (
    <div className="bg-surface border border-line rounded-lg p-4">
      <h2 className="text-sm font-bold mb-4">Tool call distribution</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data.slice(0, 12)} margin={{ top: 5, right: 10, left: 10, bottom: 60 }}>
          <XAxis
            dataKey="tool_name"
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
            contentStyle={tooltipContentStyle}
            labelStyle={tooltipLabelStyle}
            itemStyle={tooltipItemStyle}
          />
          <Bar dataKey="call_count" fill="#6D5EF7" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
