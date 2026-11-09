'use client';

import { useId } from 'react';
import { clsx } from 'clsx';

interface Option<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface Props<T extends string> {
  name: string;
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
}

/** Native radio inputs styled as segments → keyboard arrows & screen readers work for free. */
export function SegmentedControl<T extends string>({
  name,
  label,
  value,
  options,
  onChange,
}: Props<T>) {
  const id = useId();
  return (
    <div role="radiogroup" aria-labelledby={`${id}-label`} className="flex items-center gap-3">
      <span id={`${id}-label`} className="text-eyebrow text-ink-subtle uppercase">
        {label}
      </span>
      <div className="inline-flex border border-rule-strong">
        {options.map((o) => {
          const disabled = o.count === 0 && o.value !== value;
          return (
            <label
              key={o.value}
              className={clsx(
                'relative cursor-pointer px-3 py-1.5 text-caption transition-colors',
                'border-r border-rule-strong last:border-r-0',
                'has-checked:bg-ink has-checked:text-canvas',
                'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus',
                disabled ? 'cursor-not-allowed text-ink-subtle/60' : 'hover:bg-surface',
              )}
            >
              <input
                type="radio"
                name={name}
                value={o.value}
                checked={o.value === value}
                disabled={disabled}
                onChange={() => onChange(o.value)}
                className="sr-only"
              />
              {o.label}
              {o.count !== undefined && (
                <span className="ml-1.5 tabular-nums opacity-60">{o.count}</span>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}
