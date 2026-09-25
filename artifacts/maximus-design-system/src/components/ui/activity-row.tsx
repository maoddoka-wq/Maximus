export type ActivityRowData = {
  id: string;
  user: string;
  action: string;
  module: string;
  object: string;
  date: string;
};

export function ActivityRow({ activity, delay = 0 }: { activity: ActivityRowData; delay?: number }) {
  return (
    <div data-testid={`row-activity-${activity.id}`} className={`flex items-center gap-3 px-5 py-4 fade-up fade-up-delay-${Math.min(delay + 1, 3)}`}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--muted))] text-[10px] font-black text-[hsl(var(--primary))]">
        {activity.user.split(' ').map((part) => part[0]).join('')}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm"><strong>{activity.user}</strong> {activity.action}</p>
        <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">{activity.module} · {activity.object}</p>
      </div>
      <span className="mobile-hide text-[10px] text-[hsl(var(--muted-foreground))]">{activity.date}</span>
    </div>
  );
}