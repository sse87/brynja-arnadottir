'use client';

import { useEffect, useRef } from 'react';
import {
  INQUIRY_LIMITS,
  INQUIRY_VISIBLE_FIELDS,
  type InquiryField,
  type InquiryState,
} from '@/data/schema/inquiry';
import { useI18n } from '@/components/providers/I18nProvider';
import { FormField } from './FormField';
import { SubmitButton } from './SubmitButton';

interface Props {
  artworkId: string;
  artworkTitle: string;
  /** From `useActionState` in `ReprintPanel`, which owns it so no-JS POST responses render it. */
  state: InquiryState;
  formAction: (payload: FormData) => void;
  /** Epoch ms when the form was opened, or `STARTED_AT_UNSTAMPED` before JavaScript runs. */
  startedAt: number;
  headingRef?: React.Ref<HTMLHeadingElement>;
  onBack: () => void;
  /** Without JavaScript, "Back" is a plain GET of the work page (fresh form state). */
  backHref: string;
}

export function ReprintInquiryForm({
  artworkId,
  artworkTitle,
  state,
  formAction,
  startedAt,
  headingRef,
  onBack,
  backHref,
}: Props) {
  const { locale, messages } = useI18n();
  const t = messages.inquiry;
  const formRef = useRef<HTMLFormElement>(null);
  const alertRef = useRef<HTMLParagraphElement>(null);
  const successRef = useRef<HTMLHeadingElement>(null);

  // Focus management after each server response.
  useEffect(() => {
    if (state.status === 'success') {
      successRef.current?.focus();
      return;
    }
    if (state.status !== 'error') return;
    const first = INQUIRY_VISIBLE_FIELDS.find((f) => state.fieldErrors[f]);
    const el = first ? formRef.current?.elements.namedItem(first) : null;
    if (el instanceof HTMLElement) el.focus();
    else alertRef.current?.focus();
  }, [state]);

  const back = (
    <a
      href={backHref}
      onClick={(e) => {
        e.preventDefault();
        onBack();
      }}
      className="text-caption underline decoration-1 underline-offset-4 hover:decoration-2"
    >
      {t.back}
    </a>
  );

  if (state.status === 'success') {
    return (
      <div role="status" className="border border-rule p-6">
        <h2 ref={successRef} tabIndex={-1} className="font-serif text-title outline-none">
          {t.successTitle}
        </h2>
        <p className="mt-3 text-body text-ink-muted">{t.successBody}</p>
        <p className="mt-6">{back}</p>
      </div>
    );
  }

  const err = (f: InquiryField) => (state.status === 'error' ? state.fieldErrors[f] : undefined);
  const val = (f: InquiryField) => (state.status === 'error' ? state.values[f] : '');
  const msg = (code: ReturnType<typeof err>) => (code ? t.errors[code] : undefined);
  // `key` forces a remount with fresh defaultValue after each response (React 19 resets forms post-action).
  const round = state.status === 'error' ? state.at : 0;

  return (
    <form ref={formRef} action={formAction} noValidate className="flex flex-col gap-5">
      <header>
        <h2 ref={headingRef} tabIndex={-1} className="font-serif text-title outline-none">
          {t.heading}
        </h2>
        <p className="mt-2 text-caption text-ink-muted">
          {t.regarding}: <span className="text-ink">{artworkTitle}</span> ·{' '}
          <span className="tabular-nums">{artworkId}</span>
        </p>
        <p className="mt-3 text-body text-ink-muted">{t.intro}</p>
        <p className="mt-2 text-caption text-ink-muted">{t.allRequired}</p>
      </header>

      {/* Hidden context */}
      <input type="hidden" name="artworkId" value={artworkId} />
      <input type="hidden" name="artworkTitle" value={artworkTitle} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="startedAt" value={startedAt} />

      {/* Honeypot — visually and programmatically hidden from humans */}
      <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
        <label>
          Company
          <input type="text" name="company" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      {state.status === 'error' && state.formError && (
        <p
          ref={alertRef}
          tabIndex={-1}
          role="alert"
          className="border-l-2 border-danger pl-3 text-caption text-danger outline-none"
        >
          {t.errors[state.formError]}
        </p>
      )}

      <FormField
        key={`name-${round}`}
        name="name"
        label={t.name}
        autoComplete="name"
        defaultValue={val('name')}
        error={msg(err('name'))}
        maxLength={INQUIRY_LIMITS.name.max}
      />
      <FormField
        key={`email-${round}`}
        name="email"
        type="email"
        label={t.email}
        autoComplete="email"
        inputMode="email"
        defaultValue={val('email')}
        error={msg(err('email'))}
        maxLength={INQUIRY_LIMITS.email.max}
      />
      <FormField
        key={`message-${round}`}
        name="message"
        label={t.message}
        multiline
        rows={5}
        placeholder={t.messagePlaceholder}
        defaultValue={val('message')}
        error={msg(err('message'))}
        maxLength={INQUIRY_LIMITS.message.max}
      />

      <p className="text-caption text-ink-subtle">{t.privacyNote}</p>

      <div className="flex items-center justify-between gap-4">
        {back}
        <SubmitButton label={t.submit} pendingLabel={t.submitting} />
      </div>
    </form>
  );
}
