import type { Metadata } from 'next';
import { resolveLocale, alternatesFor, type LocaleParams } from '@/lib/i18n/route';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getPressItems } from '@/lib/data/about';
import { PressArchiveList } from '@/components/about/PressArchiveList';
import { openGraphFor } from '@/lib/seo/metadata';

export async function generateMetadata({ params }: { params: LocaleParams }): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const dict = getDictionary(locale);
  const t = dict.about.press;
  return {
    title: t.heading,
    description: t.intro,
    alternates: alternatesFor(locale, '/about/press'),
    openGraph: openGraphFor(locale, dict.meta.siteTitle, '/about/press', { title: t.heading }),
  };
}

export default async function PressPage({ params }: { params: LocaleParams }) {
  const locale = await resolveLocale(params);
  const dict = getDictionary(locale);
  const t = dict.about.press;

  return (
    <>
      <h1 className="font-serif text-title">{t.heading}</h1>
      <p className="mt-3 mb-stack max-w-prose-archive text-ink-muted">{t.intro}</p>
      <PressArchiveList items={getPressItems()} locale={locale} dict={dict} />
    </>
  );
}
