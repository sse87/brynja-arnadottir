import { describe, expect, it, vi } from 'vitest';
import { memoize, walk } from './generate-blur-placeholders';

const fakeBlur = async (src: string) => `data:image/webp;base64,${src}`;

describe('walk', () => {
  vi.spyOn(console, 'log').mockImplementation(() => {});

  it('fills blurDataURL on nested image objects only', async () => {
    const data = {
      image: { src: 'a', width: 1, height: 1, alt: { is: 'x', en: 'x' } },
      photos: [{ src: 'b', width: 1, height: 1 }],
      asset: { href: '/press/a.jpg', width: 1, height: 1 },
      noHeight: { src: 'c', width: 1 },
    };
    await walk(data, false, fakeBlur);
    expect(data.image).toHaveProperty('blurDataURL', 'data:image/webp;base64,a');
    expect(data.photos[0]).toHaveProperty('blurDataURL', 'data:image/webp;base64,b');
    expect(data.asset).not.toHaveProperty('blurDataURL');
    expect(data.noHeight).not.toHaveProperty('blurDataURL');
    expect(data.image.alt).not.toHaveProperty('blurDataURL');
  });

  it('keeps existing values unless forced', async () => {
    const data = [{ src: 'a', width: 1, height: 1, blurDataURL: 'data:image/webp;base64,old' }];
    await walk(data, false, fakeBlur);
    expect(data[0]?.blurDataURL).toBe('data:image/webp;base64,old');
    await walk(data, true, fakeBlur);
    expect(data[0]?.blurDataURL).toBe('data:image/webp;base64,a');
  });
});

describe('memoize', () => {
  it('fetches each src once', async () => {
    const blur = vi.fn(fakeBlur);
    const cached = memoize(blur);
    await Promise.all([cached('a'), cached('a'), cached('b')]);
    expect(blur).toHaveBeenCalledTimes(2);
  });
});
