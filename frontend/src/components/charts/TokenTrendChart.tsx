import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { fmt } from '../../lib/format';
import { tooltipContentStyle, tooltipLabelStyle, tooltipItemStyle, axisTickStyle } from './chartTheme';

interface Props {
  data: { day: string; tokens: number }[];
  title?: string;
}

export function TokenTrendChart({ data, title = 'Daily token volume' }: Props) {
  const sorted = [...data].sort((a, b) => a.day.localeCompare(b.day));
  return (
    <div className="bg-surface border border-line rounded-lg p-4">
      <h2 className="text-sm font-bold mb-4">{title}</h2>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={sorted}>
          <XAxis dataKey="day" tick={axisTickStyle} minTickGap={30} />
          <YAxis tick={axisTickStyle} tickFormatter={(v) => fmt(v)} />
          <Tooltip
            formatter={(v: number) => fmt(v)}
            contentStyle={tooltipContentStyle}
            labelStyle={tooltipLabelStyle}
            itemStyle={tooltipItemStyle}
          />
          <Line type="monotone" dataKey="tokens" stroke="#6D5EF7" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
