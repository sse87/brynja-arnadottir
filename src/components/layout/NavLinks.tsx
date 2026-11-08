'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface NavItem {
  href: string;
  label: string;
  /** `exact`: only this path is current. `prefix`: this path and anything below it. */
  match: 'exact' | 'prefix';
}

export function isCurrent(pathname: string, item: Pick<NavItem, 'href' | 'match'>): boolean {
  if (pathname === item.href) return true;
  return item.match === 'prefix' && pathname.startsWith(`${item.href}/`);
}

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <ul className="flex items-center gap-6">
      {items.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            aria-current={isCurrent(pathname, item) ? 'page' : undefined}
            className="text-caption text-ink-muted underline-offset-4 transition-colors hover:text-ink aria-[current=page]:text-ink aria-[current=page]:underline"
          >
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
