import { describe, expect, it } from 'vitest';
import { jsonLdHtml } from './JsonLd';

describe('jsonLdHtml', () => {
  it('escapes < so data cannot close the script tag', () => {
    const html = jsonLdHtml({ name: '</script><script>alert(1)</script>' });
    expect(html).not.toContain('<');
    expect(JSON.parse(html)).toEqual({ name: '</script><script>alert(1)</script>' });
  });
});
