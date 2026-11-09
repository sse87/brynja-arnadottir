import { resolveLocale, localizedPath, type LocaleParams } from '@/lib/i18n/route';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { AboutNav } from '@/components/about/AboutNav';

export default async function AboutLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: LocaleParams;
}) {
  const locale = await resolveLocale(params);
  const d = getDictionary(locale);
  const base = localizedPath(locale, '/about');

  return (
    <div className="mx-auto max-w-wide px-gutter pb-section">
      <header className="border-b border-rule pt-stack pb-2">
        <p className="text-eyebrow text-ink-subtle uppercase">{d.about.heading}</p>
        <AboutNav
          label={d.nav.aboutSections}
          items={[
            { href: base, label: d.nav.biography, match: 'exact' },
            { href: `${base}/exhibitions`, label: d.nav.exhibitions, match: 'prefix' },
            { href: `${base}/albums`, label: d.nav.albums, match: 'prefix' },
            { href: `${base}/press`, label: d.nav.press, match: 'prefix' },
          ]}
        />
      </header>
      <div className="pt-stack">{children}</div>
    </div>
  );
}
