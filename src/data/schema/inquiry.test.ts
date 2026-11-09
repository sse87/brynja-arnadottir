import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  INQUIRY_LIMITS,
  inquirySchema,
  isInquiryErrorCode,
  type InquiryErrorCode,
} from './inquiry';

const valid = {
  name: 'Guðrún',
  email: 'gudrun@example.is',
  message: 'Ég hef áhuga á eftirprenti.',
  artworkId: 'ART-0001',
  artworkTitle: 'Brjóst',
  locale: 'is',
  startedAt: '1700000000000',
};

function codeFor(field: 'name' | 'email' | 'message', value: string): InquiryErrorCode | undefined {
  const r = inquirySchema.safeParse({ ...valid, [field]: value });
  if (r.success) return undefined;
  const code = z.flattenError(r.error).fieldErrors[field]?.[0];
  return isInquiryErrorCode(code) ? code : undefined;
}

describe('inquirySchema (SPEC §4.2)', () => {
  it('accepts a valid submission, trimming fields and lowercasing the email', () => {
    const r = inquirySchema.parse({
      ...valid,
      name: '  Guðrún  ',
      email: '  Gudrun@Example.IS ',
      message: '\n Ég hef áhuga á eftirprenti. \n',
    });
    expect(r).toMatchObject({
      name: 'Guðrún',
      email: 'gudrun@example.is',
      message: 'Ég hef áhuga á eftirprenti.',
      startedAt: 1700000000000,
    });
  });

  it.each([
    ['name', '', 'name_required'],
    ['name', '   ', 'name_required'],
    ['name', 'G', 'name_too_short'],
    ['name', 'x'.repeat(INQUIRY_LIMITS.name.max + 1), 'name_too_long'],
    ['email', '', 'email_required'],
    ['email', `${'a'.repeat(INQUIRY_LIMITS.email.max)}@example.is`, 'email_too_long'],
    ['email', 'not-an-email', 'email_invalid'],
    ['message', '', 'message_required'],
    ['message', 'too short', 'message_too_short'],
    ['message', 'x'.repeat(INQUIRY_LIMITS.message.max + 1), 'message_too_long'],
  ] as const)('%s = %j → %s', (field, value, code) => {
    expect(codeFor(field, value)).toBe(code);
  });

  it('rejects malformed hidden context', () => {
    expect(inquirySchema.safeParse({ ...valid, artworkId: 'ART-1' }).success).toBe(false);
    expect(inquirySchema.safeParse({ ...valid, artworkTitle: ' ' }).success).toBe(false);
    expect(inquirySchema.safeParse({ ...valid, locale: 'de' }).success).toBe(false);
  });

  it('accepts the unstamped startedAt (0) but not negative or non-numeric values', () => {
    expect(inquirySchema.safeParse({ ...valid, startedAt: '0' }).success).toBe(true);
    expect(inquirySchema.safeParse({ ...valid, startedAt: '-1' }).success).toBe(false);
    expect(inquirySchema.safeParse({ ...valid, startedAt: 'soon' }).success).toBe(false);
  });
});
