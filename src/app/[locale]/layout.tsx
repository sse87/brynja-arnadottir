import type { Metadata } from 'next';
import '../globals.css';
import { serif, serifItalic, sans } from '../fonts';
import { locales, localeMeta } from '@/lib/i18n/config';
import { resolveLocale, alternatesFor, type LocaleParams } from '@/lib/i18n/route';
import { getDictionary, pickClientMessages } from '@/lib/i18n/dictionaries';
import { I18nProvider } from '@/components/providers/I18nProvider';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { SkipLink } from '@/components/layout/SkipLink';
import { siteUrl } from '@/lib/seo/site-url';
import { openGraphFor } from '@/lib/seo/metadata';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: LocaleParams }): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const dict = getDictionary(locale);
  return {
    metadataBase: siteUrl(),
    title: { default: dict.meta.siteTitle, template: `%s — ${dict.meta.siteTitle}` },
    description: dict.meta.siteDescription,
    alternates: alternatesFor(locale),
    openGraph: openGraphFor(locale, dict.meta.siteTitle),
  };
}

export default async function LocaleLayout({
  children,
  modal,
  params,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
  params: LocaleParams;
}) {
  const locale = await resolveLocale(params);
  const dict = getDictionary(locale);

  return (
    <html
      lang={localeMeta[locale].htmlLang}
      className={`${serif.variable} ${serifItalic.variable} ${sans.variable}`}
    >
      <body className="min-h-dvh bg-canvas font-sans text-body text-ink antialiased">
        <I18nProvider locale={locale} messages={pickClientMessages(dict)}>
          <SkipLink label={dict.nav.skipToContent} />
          <Header locale={locale} dict={dict} />
          <main id="main" tabIndex={-1} className="outline-none">
            {children}
          </main>
          <Footer locale={locale} dict={dict} />
          {modal}
        </I18nProvider>
      </body>
    </html>
  );
}
