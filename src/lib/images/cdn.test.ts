import { describe, expect, it } from 'vitest';
import { bunnyTransform } from './cdn';

describe('bunnyTransform', () => {
  it('adds width and default quality for Bunny Pull Zone URLs', () => {
    expect(bunnyTransform('https://brynja.b-cdn.net/v1/a.jpg', { width: 64 })).toBe(
      'https://brynja.b-cdn.net/v1/a.jpg?width=64&quality=80',
    );
  });

  it('keeps percent-encoded paths intact', () => {
    expect(
      bunnyTransform('https://brynja.b-cdn.net/Brj%C3%B3st%2050x35.jpg', {
        width: 64,
        quality: 70,
      }),
    ).toBe('https://brynja.b-cdn.net/Brj%C3%B3st%2050x35.jpg?width=64&quality=70');
  });

  it('supports a custom cdn.* hostname', () => {
    expect(bunnyTransform('https://cdn.example.is/a.jpg', { width: 1200 })).toContain('width=1200');
  });

  it('leaves other hosts untouched', () => {
    expect(bunnyTransform('https://example.com/a.jpg', { width: 64 })).toBe(
      'https://example.com/a.jpg',
    );
  });
});
