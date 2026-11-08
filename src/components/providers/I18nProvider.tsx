'use client';

import { createContext, use } from 'react';
import type { Locale } from '@/lib/i18n/config';
import type { ClientMessages } from '@/lib/i18n/dictionaries';

interface I18nValue {
  locale: Locale;
  messages: ClientMessages;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  locale,
  messages,
  children,
}: I18nValue & { children: React.ReactNode }) {
  return <I18nContext value={{ locale, messages }}>{children}</I18nContext>;
}

export function useI18n(): I18nValue {
  const ctx = use(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}
