'use client';

import type {
  GalleryFilters as F,
  ColorFilter,
  AvailabilityFilter,
  facetCounts,
} from '@/lib/gallery/filters';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useI18n } from '@/components/providers/I18nProvider';

interface Props {
  filters: F;
  counts: ReturnType<typeof facetCounts>;
  onChange: (patch: Partial<F>) => void;
}

export function GalleryFilters({ filters, counts, onChange }: Props) {
  const { messages } = useI18n();
  const g = messages.gallery;

  return (
    <fieldset className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
      <legend className="sr-only">{g.filtersLegend}</legend>

      <SegmentedControl<ColorFilter>
        name="ink"
        label={g.color.label}
        value={filters.color}
        onChange={(color) => onChange({ color })}
        options={[
          { value: 'all', label: g.color.all, count: counts.color.all },
          {
            value: 'black-and-white',
            label: g.color['black-and-white'],
            count: counts.color['black-and-white'],
          },
          { value: 'colorful', label: g.color.colorful, count: counts.color.colorful },
        ]}
      />

      <SegmentedControl<AvailabilityFilter>
        name="reprints"
        label={g.availability.label}
        value={filters.availability}
        onChange={(availability) => onChange({ availability })}
        options={[
          { value: 'all', label: g.availability.all, count: counts.availability.all },
          {
            value: 'reprints',
            label: g.availability.reprints,
            count: counts.availability.reprints,
          },
        ]}
      />
    </fieldset>
  );
}
