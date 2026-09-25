import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from '#components/ui/chart';
const data = [{ mois: 'Jan', ventes: 186, objectifs: 180 }, { mois: 'Fév', ventes: 205, objectifs: 190 }, { mois: 'Mar', ventes: 237, objectifs: 220 }, { mois: 'Avr', ventes: 198, objectifs: 210 }];
const config = {
  ventes: { label: 'Ventes', color: 'var(--color-chart-1)' },
  objectifs: { label: 'Objectifs', color: 'var(--color-chart-2)' },
} satisfies ChartConfig;
export function ChartDemo() { return <div className="max-w-xl p-6"><ChartContainer config={config} className="min-h-[240px] w-full"><BarChart accessibilityLayer data={data}><CartesianGrid vertical={false} /><XAxis dataKey="mois" tickLine={false} axisLine={false} tickMargin={8} /><ChartTooltip content={<ChartTooltipContent />} /><ChartLegend content={<ChartLegendContent />} /><Bar dataKey="ventes" fill="var(--color-ventes)" radius={4} /><Bar dataKey="objectifs" fill="var(--color-objectifs)" radius={4} /></BarChart></ChartContainer></div>; }