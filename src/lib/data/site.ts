import 'server-only';
import raw from '@/data/site.json';
import { siteSchema, type Site } from '@/data/schema/site';

// Parsed once at module load → invalid JSON (e.g. an `instagram` key) fails `next build`.
const site: Site = siteSchema.parse(raw);

export const getSite = (): Site => site;
