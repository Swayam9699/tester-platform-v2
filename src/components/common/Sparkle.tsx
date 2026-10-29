/** The soft four-point star from the mockup. */
export function Sparkle({ size = 120, className }: { size?: number; className?: string }) {
  const id = "sparkle"; // identical definitions, so sharing ids across instances is harmless
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-hidden>
      <defs>
        <radialGradient id={`core${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffb08a" />
          <stop offset="35%" stopColor="#f2a5a0" />
          <stop offset="70%" stopColor="#cdb5e6" />
          <stop offset="100%" stopColor="#e9e2f4" />
        </radialGradient>
        <filter id={`glow${id}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        filter={`url(#glow${id})`}
        fill={`url(#core${id})`}
        d="M50 3 C54 26 58 38 66 42 C74 46 84 48 97 50 C84 52 74 54 66 58 C58 62 54 74 50 97 C46 74 42 62 34 58 C26 54 16 52 3 50 C16 48 26 46 34 42 C42 38 46 26 50 3Z"
      />
      <path
        fill="#fff"
        opacity="0.55"
        d="M50 26 C52 40 55 46 64 50 C55 54 52 60 50 74 C48 60 45 54 36 50 C45 46 48 40 50 26Z"
      />
    </svg>
  );
}
