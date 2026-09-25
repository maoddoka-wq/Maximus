import { useState } from 'react';
import { Toggle } from '#components/ui/toggle';
export function ToggleDemo() { const [on, setOn] = useState(false); return <div className="space-y-3 p-8"><Toggle pressed={on} onPressedChange={setOn} variant="outline" size="lg" aria-label="Mode compact">Mode compact</Toggle><p className="text-xs text-muted-foreground">{on ? 'Activé' : 'Désactivé'}</p></div>; }