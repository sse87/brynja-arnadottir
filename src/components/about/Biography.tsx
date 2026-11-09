import Image from 'next/image';
import type { Biography as BiographyData } from '@/data/schema/about';
import type { Dictionary } from '@/data/schema/dictionary';
import type { Locale } from '@/lib/i18n/config';
import { formatPartialDate } from '@/lib/i18n/format';
import { maxCoverWidth } from '@/lib/images/archival';
import { localize } from '@/lib/i18n/localize';

export function Biography({
  bio,
  name,
  locale,
  dict,
}: {
  bio: BiographyData;
  name: string;
  locale: Locale;
  dict: Dictionary;
}) {
  const t = dict.about.biography;
  const { portrait } = bio;
  const credit = [portrait.credit, portrait.year].filter((p) => p !== undefined).join(', ');
  const lifespan = `${bio.born.date.slice(0, 4)}–${bio.died.date.slice(0, 4)}`;

  return (
    <article className="grid gap-gutter lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <figure className="lg:sticky lg:top-24 lg:self-start">
        <Image
          src={portrait.src}
          alt={localize(portrait.alt, locale)}
          width={portrait.width}
          height={portrait.height}
          sizes="(min-width: 1024px) 40vw, 100vw"
          quality={75}
          loading="eager"
          fetchPriority="high"
          placeholder={portrait.blurDataURL ? 'blur' : 'empty'}
          blurDataURL={portrait.blurDataURL}
          // Archival photo: the 4:5 crop must never upscale it (SPEC §5.5).
          style={{ maxWidth: maxCoverWidth(portrait.width, portrait.height, 4 / 5) }}
          className="aspect-4/5 h-auto w-full bg-mat object-cover ring-1 ring-rule"
        />
        {credit && (
          <figcaption className="mt-2 text-caption text-ink-subtle">
            {t.portraitCredit} · {credit}
          </figcaption>
        )}
      </figure>

      <div>
        <p className="text-eyebrow text-ink-subtle uppercase tabular-nums">{lifespan}</p>
        <h1 className="mt-2 font-serif text-title">{name}</h1>
        <p className="mt-4 max-w-prose-archive font-serif text-lede">
          {localize(bio.lede, locale)}
        </p>

        <div className="prose-archive mt-stack">
          {localize(bio.body, locale).map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>

        {bio.pullQuote && (
          <blockquote className="my-stack max-w-prose-archive border-y border-rule py-6 font-serif text-lede italic">
            <p>{localize(bio.pullQuote.text, locale)}</p>
            {bio.pullQuote.attribution && (
              <footer className="mt-2 font-sans text-caption text-ink-muted not-italic">
                — {bio.pullQuote.attribution}
              </footer>
            )}
          </blockquote>
        )}

        <dl className="mt-stack grid max-w-prose-archive grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-caption">
          {(
            [
              [t.born, bio.born],
              [t.died, bio.died],
            ] as const
          ).map(([label, event]) => (
            <div key={label} className="contents">
              <dt className="text-ink-muted">{label}</dt>
              <dd>
                <time dateTime={event.date}>{formatPartialDate(event.date, locale)}</time>,{' '}
                {localize(event.place, locale)}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </article>
  );
}
