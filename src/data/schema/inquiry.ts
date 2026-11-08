import { z } from 'zod';
import { locales } from '@/lib/i18n/config';

export const INQUIRY_LIMITS = {
  name: { min: 2, max: 120 },
  email: { max: 254 },
  message: { min: 10, max: 4000 },
  title: { max: 200 },
} as const;

export const MIN_FILL_TIME_MS = 3_000;

export const INQUIRY_ERROR_CODES = [
  'name_required',
  'name_too_short',
  'name_too_long',
  'email_required',
  'email_too_long',
  'email_invalid',
  'message_required',
  'message_too_short',
  'message_too_long',
  'artwork_invalid',
  'artwork_unavailable',
  'submission_too_fast',
  'send_failed',
  'unknown',
] as const;
export type InquiryErrorCode = (typeof INQUIRY_ERROR_CODES)[number];

export function isInquiryErrorCode(v: unknown): v is InquiryErrorCode {
  return typeof v === 'string' && (INQUIRY_ERROR_CODES as readonly string[]).includes(v);
}

const e = (code: InquiryErrorCode) => ({ error: code });

export const inquirySchema = z.object({
  // Visible fields
  name: z
    .string()
    .trim()
    .min(1, e('name_required'))
    .min(INQUIRY_LIMITS.name.min, e('name_too_short'))
    .max(INQUIRY_LIMITS.name.max, e('name_too_long')),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, e('email_required'))
    .max(INQUIRY_LIMITS.email.max, e('email_too_long'))
    .pipe(z.email(e('email_invalid'))),
  message: z
    .string()
    .trim()
    .min(1, e('message_required'))
    .min(INQUIRY_LIMITS.message.min, e('message_too_short'))
    .max(INQUIRY_LIMITS.message.max, e('message_too_long')),
  // Hidden context fields
  artworkId: z.string().regex(/^ART-\d{4}$/, e('artwork_invalid')),
  artworkTitle: z
    .string()
    .trim()
    .min(1, e('artwork_invalid'))
    .max(INQUIRY_LIMITS.title.max, e('artwork_invalid')),
  locale: z.enum(locales),
  startedAt: z.coerce.number().int().positive(),
});
export type InquiryInput = z.infer<typeof inquirySchema>;

export const INQUIRY_VISIBLE_FIELDS = ['name', 'email', 'message'] as const;
export type InquiryField = (typeof INQUIRY_VISIBLE_FIELDS)[number];
export type InquiryValues = Record<InquiryField, string>;

export type InquiryState =
  | { status: 'idle' }
  | { status: 'success'; at: number }
  | {
      status: 'error';
      fieldErrors: Partial<Record<InquiryField, InquiryErrorCode>>;
      formError?: InquiryErrorCode;
      /** Echo of visible inputs so React 19's automatic form reset doesn't wipe user text. */
      values: InquiryValues;
      at: number;
    };

export const INITIAL_INQUIRY_STATE: InquiryState = { status: 'idle' };
