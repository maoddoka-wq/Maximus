import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

import { ActionButton, Field } from '@/components/app-ui';

export { ActionButton, Field } from '@/components/app-ui';

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
      <div className="organization-modal-panel modal-panel card-surface w-full min-w-0 rounded-2xl p-4 shadow-2xl animate-in zoom-in-95 sm:p-7">
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
        <div className="modal-body min-w-0 overflow-x-hidden">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
