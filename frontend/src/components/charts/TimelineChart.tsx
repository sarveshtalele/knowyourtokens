import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { tooltipContentStyle, tooltipLabelStyle, tooltipItemStyle, axisTickStyle } from './chartTheme';

interface Props {
  data: { day: string; count: number }[];
}

export function TimelineChart({ data }: Props) {
  return (
    <div className="bg-surface border border-line rounded-lg p-4">
      <h2 className="text-sm font-bold mb-4">Event timeline</h2>
      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={data}>
          <XAxis dataKey="day" tick={axisTickStyle} minTickGap={30} />
          <Tooltip contentStyle={tooltipContentStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
          <Area type="monotone" dataKey="count" stroke="#6D5EF7" fill="#EEEAFE" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
