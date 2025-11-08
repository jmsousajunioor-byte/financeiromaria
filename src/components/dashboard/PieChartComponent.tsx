import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { TooltipProps, LegendProps } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PieChartComponentProps {
  data: Array<{ name: string; value: number; color: string }>;
}

const PieChartComponent = ({ data }: PieChartComponentProps) => {
  const totalValue = data.reduce((sum, item) => sum + item.value, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  type LegendPayloadItem = NonNullable<LegendProps['payload']>[number];

  const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0];
      const rawValue = Number(dataPoint?.value ?? 0);
      const percentage = totalValue === 0 ? '0.0' : ((rawValue / totalValue) * 100).toFixed(1);
      return (
        <div className="bg-card border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{dataPoint?.name}</p>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(rawValue)}
          </p>
          <p className="text-sm font-semibold text-primary">
            {percentage}%
          </p>
        </div>
      );
    }
    return null;
  };

  if (data.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Gastos por Categoria</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Sem dados para exibir</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Gastos por Categoria</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
              animationBegin={0}
              animationDuration={800}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value, entry: LegendPayloadItem) => {
                const entryValue = Number(entry?.payload?.value ?? 0);
                const percentage = totalValue === 0 ? '0' : ((entryValue / totalValue) * 100).toFixed(0);
                return `${value} (${percentage}%)`;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default PieChartComponent;
