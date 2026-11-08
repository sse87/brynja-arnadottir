import { SocialLink } from './SocialLink';
import { getSite } from '@/lib/data/site';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/data/schema/dictionary';

// `locale` is part of the shared layout-component signature (SPEC §2.3); unused until localized links land here.
export function Footer({ dict }: { locale: Locale; dict: Dictionary }) {
  const { social } = getSite();

  return (
    <footer className="border-t border-rule">
      <div className="mx-auto flex max-w-wide items-center justify-between gap-gutter px-gutter py-10">
        <p className="text-caption text-ink-subtle">{dict.footer.rights}</p>
        <SocialLink
          url={social.facebook.url}
          label={dict.footer.facebook}
          newTabHint={dict.footer.opensInNewTab}
        />
      </div>
    </footer>
  );
}
