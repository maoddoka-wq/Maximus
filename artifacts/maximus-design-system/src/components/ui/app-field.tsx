import { useState, type HTMLInputTypeAttribute, type ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  testId,
  help,
}: {
  label: ReactNode;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: HTMLInputTypeAttribute;
  testId?: string;
  help?: string;
}) {
  const labelText = typeof label === 'string' ? label : 'ce champ';
  const explanation = help ?? `Saisissez ${labelText.toLowerCase().replace(' *', '')}.`;
  const fieldTestId = testId ?? '';
  const isPassword = type === 'password';
  const [passwordVisible, setPasswordVisible] = useState(false);
  const autoComplete = fieldTestId.includes('login-email')
    ? 'email'
    : fieldTestId.includes('login-password')
      ? 'current-password'
      : type === 'email'
        ? 'email'
        : type === 'password'
          ? 'new-password'
          : undefined;

  return (
    <label className="block text-sm font-semibold">
      {label}
      <span className="relative mt-2 block">
        <input
          data-testid={testId}
          autoComplete={autoComplete}
          type={isPassword && passwordVisible ? 'text' : type}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3.5 py-3 text-sm font-normal transition focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary)/.14)] ${isPassword ? 'pr-11' : ''}`}
        />
        {isPassword && (
          <button
            type="button"
            data-testid={fieldTestId ? `button-toggle-password-${fieldTestId}` : undefined}
            aria-label={passwordVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            onClick={() => setPasswordVisible((visible) => !visible)}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-[hsl(var(--muted-foreground))] transition hover:text-[hsl(var(--foreground))]"
          >
            {passwordVisible ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        )}
      </span>
      <span className="mt-1 block text-[10px] font-normal leading-4 text-[hsl(var(--muted-foreground))]">
        {explanation}
      </span>
    </label>
  );
}