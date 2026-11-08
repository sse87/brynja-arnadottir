import { siFacebook } from 'simple-icons';

/** Official Facebook mark path from the `simple-icons` package; render unmodified, monochrome. */
export function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
    >
      <path d={siFacebook.path} />
    </svg>
  );
}
