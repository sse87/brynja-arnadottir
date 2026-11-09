import Image from 'next/image';
import Link from 'next/link';
import type { GalleryItem } from '@/data/schema/artwork';
import type { Locale } from '@/lib/i18n/config';
import { cn } from '@/lib/cn';

export function ArtworkCard({
  item,
  locale,
  query,
  eager,
}: {
  item: GalleryItem;
  locale: Locale;
  query: string;
  eager: boolean;
}) {
  const href = `/${locale}/works/${item.slug}${query ? `?${query}` : ''}`;
  const mono = item.styleCategory === 'black-and-white';

  return (
    <figure data-artwork-card={item.slug} className="group">
      <Link href={href} scroll={false} className="block focus-visible:outline-offset-4">
        <div className={cn('bg-mat', mono && 'ring-1 ring-rule')}>
          <Image
            src={item.image.src}
            alt={item.image.alt}
            width={item.image.width}
            height={item.image.height}
            sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
            quality={75}
            placeholder={item.image.blurDataURL ? 'blur' : 'empty'}
            blurDataURL={item.image.blurDataURL}
            loading={eager ? 'eager' : 'lazy'}
            fetchPriority={eager ? 'high' : 'auto'}
            className="h-auto w-full"
          />
        </div>
        <figcaption className="mt-3 flex items-baseline justify-between gap-3">
          <span className="font-serif text-body leading-snug decoration-1 underline-offset-4 group-hover:underline">
            {item.title}
          </span>
          {item.year !== null && (
            <span className="shrink-0 text-caption text-ink-muted tabular-nums">{item.year}</span>
          )}
        </figcaption>
      </Link>
    </figure>
  );
}
