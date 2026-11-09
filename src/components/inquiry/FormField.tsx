import { useId } from 'react';
import { cn } from '@/lib/cn';

type Base = {
  name: string;
  label: string;
  error?: string;
  defaultValue?: string;
  maxLength?: number;
  placeholder?: string;
};
type InputProps = Base & {
  multiline?: false;
  type?: 'text' | 'email';
  autoComplete?: string;
  inputMode?: 'email' | 'text';
};
type AreaProps = Base & { multiline: true; rows?: number };

export function FormField(props: InputProps | AreaProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const shared = {
    id,
    name: props.name,
    defaultValue: props.defaultValue,
    maxLength: props.maxLength,
    placeholder: props.placeholder,
    'aria-invalid': props.error ? true : undefined,
    'aria-describedby': props.error ? errorId : undefined,
    className: cn(
      'w-full border border-rule-strong bg-surface px-3 py-2.5 text-body text-ink placeholder:text-ink-subtle',
      'focus:border-ink focus:outline-none aria-invalid:border-danger',
    ),
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-caption text-ink-muted">
        {props.label}
      </label>
      {props.multiline ? (
        <textarea {...shared} rows={props.rows ?? 5} className={cn(shared.className, 'resize-y')} />
      ) : (
        <input
          {...shared}
          type={props.type ?? 'text'}
          autoComplete={props.autoComplete}
          inputMode={props.inputMode}
        />
      )}
      {props.error && (
        <p id={errorId} className="text-caption text-danger">
          {props.error}
        </p>
      )}
    </div>
  );
}
