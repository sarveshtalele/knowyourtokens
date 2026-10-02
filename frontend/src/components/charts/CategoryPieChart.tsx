import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { tooltipContentStyle, tooltipItemStyle, legendTextStyle } from './chartTheme';

const COLORS = ['#6D5EF7', '#2878C8', '#0F9D72', '#C27A12', '#C53D4B', '#a49cff'];

interface Props {
  data: { name: string; value: number }[];
  title?: string;
}

export function CategoryPieChart({ data, title = 'Distribution' }: Props) {
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  return (
    <div className="bg-surface border border-line rounded-lg p-4">
      <h2 className="text-sm font-bold mb-4">{title}</h2>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={90}
            label={({ name, value }) => `${name} ${Math.round(((value as number) / total) * 100)}%`}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="rgb(var(--color-surface))" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v: number, name: string) => [`${v} (${Math.round((v / total) * 100)}%)`, name]}
            contentStyle={tooltipContentStyle}
            itemStyle={tooltipItemStyle}
          />
          <Legend wrapperStyle={legendTextStyle} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
