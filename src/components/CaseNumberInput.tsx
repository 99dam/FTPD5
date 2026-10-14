import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface CaseNumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  kind: 'black' | 'red';
  label?: string;
  error?: string;
}

/** Labelled input for a black / red case number (stored as TEXT). */
export const CaseNumberInput = forwardRef<HTMLInputElement, CaseNumberInputProps>(function CaseNumberInput(
  { kind, label, error, id, ...props },
  ref,
) {
  const text = label ?? (kind === 'black' ? 'เลขคดีดำ' : 'เลขคดีแดง');
  return (
    <div>
      <label htmlFor={id} className="field-label flex items-center gap-2">
        <span
          className={cn('size-2.5 rounded-full', kind === 'black' ? 'bg-navy-900' : 'bg-danger-600')}
          aria-hidden
        />
        {text}
      </label>
      <input
        ref={ref}
        id={id}
        type="text"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        maxLength={50}
        placeholder={kind === 'black' ? 'เช่น อ.123/2569' : 'เช่น อ.456/2569'}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn('field font-semibold tracking-wide', error && 'border-danger-600 focus:ring-danger-600/15')}
        {...props}
      />
      {error && (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
});
