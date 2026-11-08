import { describe, expect, it } from 'vitest';
import { siteSchema } from './site';

const valid = {
  artist: { name: 'Brynja Árnadóttir', born: '1942', died: '2025' },
  social: { facebook: { url: 'https://www.facebook.com/profile.php?id=100028409782920' } },
};

describe('siteSchema (SPEC §5.7)', () => {
  it('accepts the Facebook-only shape', () => {
    expect(siteSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects an instagram key', () => {
    const result = siteSchema.safeParse({
      ...valid,
      social: { ...valid.social, instagram: { url: 'https://instagram.com/x' } },
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({
      code: 'unrecognized_keys',
      keys: ['instagram'],
    });
  });

  it('rejects a non-Facebook URL', () => {
    const result = siteSchema.safeParse({
      ...valid,
      social: { facebook: { url: 'https://example.com/brynja' } },
    });
    expect(result.success).toBe(false);
  });
});
