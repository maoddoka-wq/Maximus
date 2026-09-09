import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react';

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const Icon = variant === 'destructive'
          ? AlertCircle
          : variant === 'success'
            ? CheckCircle2
            : variant === 'warning'
              ? TriangleAlert
              : Info;
        return (
          <Toast key={id} variant={variant} {...props}>
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
