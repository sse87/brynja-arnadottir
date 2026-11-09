'use server';

import { createElement } from 'react';
import { z } from 'zod';
import { getResend } from '@/lib/email/resend';
import { getServerEnv } from '@/lib/env';
import { getArtworkById } from '@/lib/data/artworks';
import { bunnyTransform } from '@/lib/images/cdn';
import { ReprintInquiryEmail } from '@/components/emails/ReprintInquiryEmail';
import {
  inquirySchema,
  isInquiryErrorCode,
  MIN_FILL_TIME_MS,
  INQUIRY_VISIBLE_FIELDS,
  STARTED_AT_UNSTAMPED,
  type InquiryState,
  type InquiryValues,
  type InquiryField,
  type InquiryErrorCode,
} from '@/data/schema/inquiry';

const CONTEXT_FIELDS = ['artworkId', 'artworkTitle', 'locale', 'startedAt'] as const;

function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === 'string' ? v : '';
}

function errorState(
  values: InquiryValues,
  extra: {
    fieldErrors?: Partial<Record<InquiryField, InquiryErrorCode>>;
    formError?: InquiryErrorCode;
  },
): InquiryState {
  return {
    status: 'error',
    fieldErrors: extra.fieldErrors ?? {},
    formError: extra.formError,
    values,
    at: Date.now(),
  };
}

export async function sendInquiry(_prev: InquiryState, formData: FormData): Promise<InquiryState> {
  const values: InquiryValues = {
    name: str(formData, 'name'),
    email: str(formData, 'email'),
    message: str(formData, 'message'),
  };

  // 1. Honeypot — bots get a fake success and nothing is sent.
  if (str(formData, 'company') !== '') return { status: 'success', at: Date.now() };

  // 2. Validation
  const parsed = inquirySchema.safeParse({
    ...values,
    artworkId: str(formData, 'artworkId'),
    artworkTitle: str(formData, 'artworkTitle'),
    locale: str(formData, 'locale'),
    startedAt: str(formData, 'startedAt'),
  });

  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    const mapped: Partial<Record<InquiryField, InquiryErrorCode>> = {};
    for (const f of INQUIRY_VISIBLE_FIELDS) {
      const code = fieldErrors[f]?.[0];
      if (code) mapped[f] = isInquiryErrorCode(code) ? code : 'unknown';
    }
    const contextBroken = CONTEXT_FIELDS.some((k) => fieldErrors[k]?.length);
    return errorState(values, {
      fieldErrors: mapped,
      formError: contextBroken ? 'artwork_invalid' : undefined,
    });
  }

  const data = parsed.data;

  // 3. Speed bump against naive bots (client-supplied → not a security boundary).
  //    Unstamped = submitted without JavaScript from a static page; there is no start time.
  if (data.startedAt !== STARTED_AT_UNSTAMPED && Date.now() - data.startedAt < MIN_FILL_TIME_MS) {
    return errorState(values, { formError: 'submission_too_fast' });
  }

  // 4. Server-side truth — never trust hidden fields.
  const artwork = getArtworkById(data.artworkId);
  if (!artwork) return errorState(values, { formError: 'artwork_invalid' });
  if (!artwork['available-as-reprint']) {
    return errorState(values, { formError: 'artwork_unavailable' });
  }

  // 5. Send. Env parsing is inside the try: a misconfigured deployment shows `send_failed`
  //    in the form instead of throwing into the error boundary.
  try {
    const env = getServerEnv();
    const artworkUrl = `${env.NEXT_PUBLIC_SITE_URL}/${data.locale}/works/${artwork.slug}`;

    const { error } = await getResend().emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: [env.INQUIRY_TO_EMAIL],
      replyTo: data.email,
      subject: `Fyrirspurn um eftirprent · Reprint inquiry — ${artwork.title.is} (${artwork.id})`,
      react: createElement(ReprintInquiryEmail, {
        name: data.name,
        email: data.email,
        message: data.message,
        artworkId: artwork.id,
        artworkTitleIs: artwork.title.is,
        artworkTitleEn: artwork.title.en,
        artworkYear: artwork.year,
        artworkImageUrl: bunnyTransform(artwork.image.src, { width: 1072 }),
        artworkUrl,
        submittedLocale: data.locale,
        submittedAt: new Date().toISOString(),
      }),
      tags: [{ name: 'type', value: 'reprint-inquiry' }],
    });

    if (error) {
      // Log artwork ID and error metadata only — never name, email or message.
      console.error('[sendInquiry] Resend error', {
        name: error.name,
        message: error.message,
        artworkId: artwork.id,
      });
      return errorState(values, { formError: 'send_failed' });
    }
  } catch (err) {
    // Not the raw error object: SDK errors can carry the request payload (user PII).
    console.error('[sendInquiry] Unexpected failure', {
      name: err instanceof Error ? err.name : typeof err,
      message: err instanceof Error ? err.message : undefined,
      artworkId: artwork.id,
    });
    return errorState(values, { formError: 'send_failed' });
  }

  return { status: 'success', at: Date.now() };
}
