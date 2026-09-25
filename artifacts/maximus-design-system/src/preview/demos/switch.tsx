import { useState } from 'react';
import { Switch } from '#components/ui/switch';
export function SwitchDemo() { const [enabled, setEnabled] = useState(true); return <div className="flex items-center gap-3 p-8"><Switch checked={enabled} onCheckedChange={setEnabled} id="alerts" /><label htmlFor="alerts" className="text-sm">Alertes actives · {enabled ? 'oui' : 'non'}</label></div>; }