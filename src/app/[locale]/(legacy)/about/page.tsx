import type { Metadata } from 'next';
import { resolveLocale, alternatesFor, type LocaleParams } from '@/lib/i18n/route';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { localize } from '@/lib/i18n/localize';
import { getBiography } from '@/lib/data/about';
import { getSite } from '@/lib/data/site';
import type { Locale } from '@/lib/i18n/config';
import { Biography } from '@/components/about/Biography';

export async function generateMetadata({ params }: { params: LocaleParams }): Promise<Metadata> {
  const locale = await resolveLocale(params);
  return {
    title: getDictionary(locale).nav.biography,
    description: localize(getBiography().lede, locale),
    alternates: alternatesFor(locale, '/about'),
  };
}

function personJsonLd(locale: Locale) {
  const bio = getBiography();
  const { artist, social } = getSite();
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: artist.name,
    birthDate: bio.born.date,
    deathDate: bio.died.date,
    birthPlace: { '@type': 'Place', name: localize(bio.born.place, locale) },
    deathPlace: { '@type': 'Place', name: localize(bio.died.place, locale) },
    image: bio.portrait.src,
    sameAs: [social.facebook.url],
  };
}

export default async function BiographyPage({ params }: { params: LocaleParams }) {
  const locale = await resolveLocale(params);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(personJsonLd(locale)).replace(/</g, '\\u003c'),
        }}
      />
      <Biography
        bio={getBiography()}
        name={getSite().artist.name}
        locale={locale}
        dict={getDictionary(locale)}
      />
    </>
  );
}
