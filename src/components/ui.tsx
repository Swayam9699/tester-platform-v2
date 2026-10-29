import clsx from "clsx";
import Link from "next/link";
import type { ReactNode } from "react";
import type { SlotBreakdown } from "@/server/queries";

export const cx = clsx;

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

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" className={cx("h-7 w-7", className)} aria-hidden>
      <rect x="1" y="6" width="12" height="16" rx="6" fill="#0f1115" />
      <rect x="15" y="6" width="12" height="16" rx="6" fill="#0f1115" />
      <rect x="7" y="11" width="14" height="6" rx="3" fill="#fff" />
    </svg>
  );
}

const AVATAR_TONES = [
  "from-[#f7b89b] to-[#e98463]",
  "from-[#b8c4f2] to-[#7d8fe0]",
  "from-[#a8dcc3] to-[#5cb08a]",
  "from-[#f3d08d] to-[#e2a33c]",
  "from-[#d6bdf0] to-[#a37ad9]",
  "from-[#f2b0c6] to-[#dc6f95]",
  "from-[#a9d8ea] to-[#4fa3c7]",
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function Avatar({
  name,
  src,
  size = 28,
  className,
  ring = true,
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
  ring?: boolean;
}) {
  const style = { width: size, height: size, fontSize: Math.max(10, size * 0.38) };
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} style={style} className={cx("rounded-full object-cover", ring && "ring-2 ring-white", className)} />;
  }
  return (
    <span
      style={style}
      title={name}
      className={cx(
        "inline-grid shrink-0 place-items-center rounded-full bg-gradient-to-br font-semibold text-white",
        AVATAR_TONES[hash(name) % AVATAR_TONES.length],
        ring && "ring-2 ring-white",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

export function AvatarStack({ people, size = 26 }: { people: { name: string; avatarUrl?: string | null }[]; size?: number }) {
  return (
    <div className="flex -space-x-1.5">
      {people.map((p, i) => (
        <Avatar key={i} name={p.name} src={p.avatarUrl} size={size} />
      ))}
    </div>
  );
}

const LOGO_TONES = ["bg-[#fde2d6] text-[#c3552f]", "bg-[#e3e7fc] text-[#4453c4]", "bg-[#dff3e8] text-[#23794f]", "bg-[#fbecd0] text-[#a46a0b]", "bg-[#efe3fb] text-[#7a45b8]"];

export function AppLogo({ name, src, size = 44, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  const style = { width: size, height: size, borderRadius: size * 0.28 };
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" style={style} className={cx("shrink-0 bg-white object-cover shadow-sm ring-1 ring-black/5", className)} />;
  }
  return (
    <span
      style={{ ...style, fontSize: size * 0.4 }}
      className={cx("grid shrink-0 place-items-center font-semibold ring-1 ring-black/5", LOGO_TONES[hash(name) % LOGO_TONES.length], className)}
    >
      {name.trim()[0]?.toUpperCase()}
    </span>
  );
}

/** 16 segments: completed, active, joined/pending, free. */
export function SlotBar({ slots, total = 16, showLegend = false }: { slots: SlotBreakdown; total?: number; showLegend?: boolean }) {
  const segs = [
    ...Array(slots.completed).fill("bg-ok"),
    ...Array(slots.active).fill("bg-ink"),
    ...Array(slots.pending).fill("bg-peach"),
  ].slice(0, total);
  while (segs.length < total) segs.push("bg-black/[0.07]");
  return (
    <div>
      <div className="flex gap-[3px]" role="img" aria-label={`${slots.used} of ${total} tester slots used`}>
        {segs.map((c, i) => (
          <span key={i} className={cx("h-2 flex-1 rounded-full", c)} />
        ))}
      </div>
      {showLegend && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          <Legend className="bg-ok" label={`${slots.completed} completed`} />
          <Legend className="bg-ink" label={`${slots.active} active`} />
          <Legend className="bg-peach" label={`${slots.pending} joining`} />
          <Legend className="bg-black/10" label={`${Math.max(0, total - slots.used)} free`} />
        </div>
      )}
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cx("h-2 w-2 rounded-full", className)} />
      {label}
    </span>
  );
}

const TONES = {
  neutral: "bg-black/[0.05] text-ink-2",
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
  info: "bg-info-soft text-info",
  dark: "bg-ink text-white",
} as const;

export function Badge({ tone = "neutral", children, className }: { tone?: keyof typeof TONES; children: ReactNode; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", TONES[tone], className)}>
      {children}
    </span>
  );
}

const STATUS_TONE: Record<string, keyof typeof TONES> = {
  draft: "neutral",
  in_review: "info",
  open: "ok",
  full: "dark",
  completed: "info",
  archived: "neutral",
  requested: "warn",
  accepted: "info",
  rejected: "neutral",
  active: "ok",
  broken: "bad",
  cancelled: "neutral",
  pending: "warn",
  joined: "info",
  skipped: "bad",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONE[status] ?? "neutral"}>{status.replace("_", " ")}</Badge>;
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      {icon && <div className="mb-3 text-3xl">{icon}</div>}
      <p className="font-medium text-ink">{title}</p>
      {body && <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, hint, children }: { label: string; value: ReactNode; hint?: ReactNode; children?: ReactNode }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-ink">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      {children}
    </div>
  );
}

export function Progress({ value, max, className }: { value: number; max: number; className?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={cx("h-1.5 overflow-hidden rounded-full bg-black/[0.07]", className)}>
      <div className="h-full rounded-full bg-gradient-to-r from-[#f6a47e] to-[#ef7b5b]" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 mt-8 flex items-center justify-between">
      <h2 className="text-sm font-semibold text-ink">{children}</h2>
      {action}
    </div>
  );
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-sm font-medium text-ink-2 underline-offset-4 hover:text-ink hover:underline">
      {children}
    </Link>
  );
}
