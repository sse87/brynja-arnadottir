import type { Exhibition } from '@/data/schema/about';

/** 1968 → 1960. */
export const decadeOf = (date: string): number => Math.floor(Number(date.slice(0, 4)) / 10) * 10;

/** 1960 → "1960–1969". */
export const decadeLabel = (decade: number): string => `${decade}–${decade + 9}`;

/** Groups by decade, keeping the input order of both the groups and the items within them. */
export function groupByDecade<T extends Pick<Exhibition, 'date'>>(
  items: readonly T[],
): [decade: number, items: T[]][] {
  const groups = new Map<number, T[]>();
  for (const item of items) {
    const decade = decadeOf(item.date);
    const list = groups.get(decade);
    if (list) list.push(item);
    else groups.set(decade, [item]);
  }
  return [...groups];
}
