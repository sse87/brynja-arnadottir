import 'server-only';
import { z } from 'zod';

const serverEnvSchema = z.object({
  RESEND_API_KEY: z.string().startsWith('re_'),
  RESEND_FROM_EMAIL: z.string().min(3), // "Name <addr@verified-domain>"
  INQUIRY_TO_EMAIL: z.email(),
  NEXT_PUBLIC_SITE_URL: z.url(),
});

let cached: z.infer<typeof serverEnvSchema> | undefined;

/** Lazy: parsed on first use (request time), so builds without secrets still succeed. */
export function getServerEnv() {
  cached ??= serverEnvSchema.parse(process.env);
  return cached;
}
