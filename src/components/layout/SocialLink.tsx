import { FacebookIcon } from '@/components/icons/FacebookIcon';

export function SocialLink({
  url,
  label,
  newTabHint,
}: {
  url: string;
  label: string;
  newTabHint: string;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="me noopener noreferrer"
      aria-label={`${label} ${newTabHint}`}
      className="grid size-11 place-items-center text-ink-muted transition-colors hover:text-ink"
    >
      <FacebookIcon className="size-5" />
    </a>
  );
}
