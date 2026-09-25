import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';
export function TooltipDemo() {
  return <div className="p-10"><TooltipProvider><Tooltip><TooltipTrigger asChild><button type="button" className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"><Info className="h-4 w-4" />Survolez ou utilisez Entrée</button></TooltipTrigger><TooltipContent>Informations sur le module</TooltipContent></Tooltip></TooltipProvider></div>;
}