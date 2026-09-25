import { Skeleton } from '../../components/ui/skeleton';

export function SkeletonDemo() {
  return <div className="card-surface space-y-4 p-6"><div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><div className="space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-28" /></div></div><Skeleton className="h-20 w-full" /></div>;
}