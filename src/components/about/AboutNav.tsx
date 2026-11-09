'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isCurrent, type NavItem } from '@/components/layout/NavLinks';

/** About sub-navigation: horizontal, scrolls sideways on narrow screens (SPEC §5.1). */
export function AboutNav({ label, items }: { label: string; items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label={label} className="-mx-gutter mt-3 overflow-x-auto px-gutter">
      <ul className="flex snap-x gap-6 whitespace-nowrap">
        {items.map((item) => (
          <li key={item.href} className="snap-start">
            <Link
              href={item.href}
              aria-current={isCurrent(pathname, item) ? 'page' : undefined}
              className="inline-block py-2 text-body text-ink-muted decoration-ink decoration-1 underline-offset-[6px] transition-colors hover:text-ink aria-[current=page]:text-ink aria-[current=page]:underline"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
