import React from 'react';
import { createPortal } from 'react-dom';
import { Plus, X } from 'lucide-react';
import {
  modules as allModules,
  stockSubmodules,
  type Module,
} from '@/lib/store';

export const defaultCompanyTheme = {
  primaryColor: '#F2B705',
  accentColor: '#F2B705',
  sidebarColor: '#161D27',
};

export const companyThemePresets = [
  { name: 'MAXIMUS', primaryColor: '#F2B705', accentColor: '#F2B705', sidebarColor: '#161D27' },
  { name: 'Océan', primaryColor: '#0E7490', accentColor: '#06B6D4', sidebarColor: '#062A38' },
  { name: 'Forêt', primaryColor: '#15803D', accentColor: '#84CC16', sidebarColor: '#102A1C' },
  { name: 'Prune', primaryColor: '#7E22CE', accentColor: '#DB2777', sidebarColor: '#24132D' },
  { name: 'Terre', primaryColor: '#C2410C', accentColor: '#EA580C', sidebarColor: '#351B12' },
];

export const isHexColor = (value: string) => /^#[0-9a-f]{6}$/i.test(value);

export function ActionButton({
  children,
  onClick,
  primary = false,
  testId,
  icon: ButtonIcon = Plus,
  disabled = false,
  className = '',
}: any) {
  return (
    <button
      disabled={disabled}
      data-testid={testId}
      onClick={onClick}
      className={`app-action btn flex items-center justify-center gap-2 rounded-lg px-3.5 py-2.5 text-xs font-bold ${primary ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'border bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))]'} ${disabled ? 'cursor-not-allowed opacity-50' : ''} ${className}`}
    >
      <ButtonIcon size={15} />
      {children}
    </button>
  );
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return createPortal(
    <div className="modal-backdrop organization-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in">
      <div className="organization-modal-panel modal-panel card-surface w-full rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 sm:p-7">
        <div className="modal-header mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 hover:bg-[hsl(var(--muted))]"
          >
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function Field({
  label,
  value,
  onChange,
  type = 'text',
  testId,
  placeholder = '',
  help,
}: any) {
  const explanation =
    help ?? `Saisissez ${String(label).toLowerCase().replace(' *', '')}.`;

  return (
    <label className="block text-sm font-semibold">
      {label}
      <input
        data-testid={testId}
        type={type}
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-lg border bg-[hsl(var(--card))] px-3 py-3 text-sm focus:border-[hsl(var(--primary))] focus:ring-1 focus:ring-[hsl(var(--primary))]"
      />
      <span className="field-help mt-1 block text-[10px] font-normal leading-4 text-[hsl(var(--muted-foreground))]">
        {explanation}
      </span>
    </label>
  );
}

export function permissionLabel(
  key: string,
  moduleDefinitions: Module[] = allModules,
) {
  const menuMatch = key.match(/^([^:]+):menu:(.+)$/);
  if (menuMatch) {
    return `${moduleDefinitions.find(module => module.id === menuMatch[1])?.name ?? menuMatch[1]} · ${menuMatch[2].replace(/-/g, ' ')}`;
  }
  if (key.startsWith('stocks:')) {
    return `Gestion de stock · ${stockSubmodules.find(item => item.id === key.slice('stocks:'.length))?.name ?? key.slice('stocks:'.length)}`;
  }
  if (key.startsWith('presence.')) {
    return `Présences · ${key.slice('presence.'.length)}`;
  }
  return allModules.find(module => module.id === key)?.name || key;
}