import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_INQUIRY_STATE, MIN_FILL_TIME_MS } from '@/data/schema/inquiry';

vi.mock('server-only', () => ({}));

const send = vi.fn();
vi.mock('@/lib/email/resend', () => ({ getResend: () => ({ emails: { send } }) }));

const ENV = {
  RESEND_API_KEY: 're_test',
  RESEND_FROM_EMAIL: 'Archive <inquiries@example.is>',
  INQUIRY_TO_EMAIL: 'estate@example.is',
  NEXT_PUBLIC_SITE_URL: 'https://archive.example.is',
};
const getServerEnv = vi.fn(() => ENV);
vi.mock('@/lib/env', () => ({ getServerEnv: () => getServerEnv() }));

const { sendInquiry } = await import('./sendInquiry');

// Fixture data (src/data/artworks.json): ART-0001 brjost (reprint), ART-0002 brynja (no reprint).
const PII = {
  name: 'Guðrún Jónsdóttir',
  email: '  Gudrun@Example.IS ',
  message: 'Ég hef áhuga á A3.',
};

function form(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData();
  const fields: Record<string, string> = {
    ...PII,
    artworkId: 'ART-0001',
    artworkTitle: 'Brjóst',
    locale: 'en',
    startedAt: String(Date.now() - MIN_FILL_TIME_MS - 1_000),
    company: '',
    ...overrides,
  };
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const run = (fd: FormData) => sendInquiry(INITIAL_INQUIRY_STATE, fd);

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  send.mockReset().mockResolvedValue({ data: { id: 'email_1' }, error: null });
  getServerEnv.mockReset().mockReturnValue(ENV);
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  // SPEC §4.4: never log name, email or message.
  const logged = JSON.stringify(consoleError.mock.calls);
  for (const value of [PII.name, PII.email.trim(), 'gudrun@example.is', PII.message]) {
    expect(logged).not.toContain(value);
  }
  consoleError.mockRestore();
});

describe('sendInquiry (SPEC §4.4)', () => {
  it('honeypot: fakes success and sends nothing', async () => {
    const state = await run(form({ company: 'Acme', name: '' }));
    expect(state.status).toBe('success');
    expect(send).not.toHaveBeenCalled();
  });

  it('validation failure: returns field codes and echoes the raw values', async () => {
    const state = await run(form({ name: '', email: 'not-an-email', message: 'short' }));
    expect(state).toMatchObject({
      status: 'error',
      fieldErrors: { name: 'name_required', email: 'email_invalid', message: 'message_too_short' },
      formError: undefined,
      values: { name: '', email: 'not-an-email', message: 'short' },
    });
    expect(send).not.toHaveBeenCalled();
  });

  it('broken hidden context: reports artwork_invalid as a form error', async () => {
    const state = await run(form({ artworkId: 'bogus', locale: 'de' }));
    expect(state).toMatchObject({ status: 'error', fieldErrors: {}, formError: 'artwork_invalid' });
    expect(send).not.toHaveBeenCalled();
  });

  it('too fast: rejects a submission inside the minimum fill time', async () => {
    const state = await run(form({ startedAt: String(Date.now() - 500) }));
    expect(state).toMatchObject({ status: 'error', formError: 'submission_too_fast' });
    expect(send).not.toHaveBeenCalled();
  });

  it('unstamped startedAt (no-JS submission) skips the speed bump', async () => {
    const state = await run(form({ startedAt: '0' }));
    expect(state.status).toBe('success');
    expect(send).toHaveBeenCalledOnce();
  });

  it('unknown artwork: artwork_invalid', async () => {
    const state = await run(form({ artworkId: 'ART-9999' }));
    expect(state).toMatchObject({ status: 'error', formError: 'artwork_invalid' });
    expect(send).not.toHaveBeenCalled();
  });

  it('artwork not available as a reprint: artwork_unavailable', async () => {
    const state = await run(form({ artworkId: 'ART-0002' }));
    expect(state).toMatchObject({ status: 'error', formError: 'artwork_unavailable' });
    expect(send).not.toHaveBeenCalled();
  });

  it('Resend error: send_failed, values preserved', async () => {
    send.mockResolvedValue({
      data: null,
      error: { name: 'validation_error', message: 'bad from' },
    });
    const state = await run(form());
    expect(state).toMatchObject({ status: 'error', formError: 'send_failed', values: PII });
    expect(consoleError).toHaveBeenCalled();
  });

  it('Resend throws: send_failed', async () => {
    send.mockRejectedValue(new Error('network down'));
    const state = await run(form());
    expect(state).toMatchObject({ status: 'error', formError: 'send_failed' });
  });

  it('missing / invalid env: send_failed instead of throwing', async () => {
    getServerEnv.mockImplementation(() => {
      throw new Error('Invalid environment');
    });
    const state = await run(form());
    expect(state).toMatchObject({ status: 'error', formError: 'send_failed' });
    expect(send).not.toHaveBeenCalled();
  });

  it('success: sends with server-side artwork data, not the submitted title', async () => {
    const state = await run(form({ artworkTitle: 'Spoofed title' }));
    expect(state.status).toBe('success');
    expect(send).toHaveBeenCalledOnce();

    const payload = send.mock.calls[0]?.[0];
    expect(payload).toMatchObject({
      from: ENV.RESEND_FROM_EMAIL,
      to: [ENV.INQUIRY_TO_EMAIL],
      replyTo: 'gudrun@example.is',
      subject: 'Fyrirspurn um eftirprent · Reprint inquiry — Brjóst (ART-0001)',
      tags: [{ name: 'type', value: 'reprint-inquiry' }],
    });
    expect(JSON.stringify(payload)).not.toContain('Spoofed');
    expect(payload.react.props).toMatchObject({
      name: PII.name,
      email: 'gudrun@example.is',
      message: PII.message,
      artworkId: 'ART-0001',
      artworkTitleIs: 'Brjóst',
      artworkTitleEn: 'Bust',
      artworkUrl: 'https://archive.example.is/en/works/brjost',
      submittedLocale: 'en',
    });
    expect(payload.react.props.artworkImageUrl).toMatch(
      /^https:\/\/brynja\.b-cdn\.net\/.+\?width=1072&quality=80$/,
    );
  });
});
