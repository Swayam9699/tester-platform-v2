import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, hashString } from "@/lib/utils";
import { initials } from "./utils";

const TONES = [
  "from-[#f7b89b] to-[#e98463]",
  "from-[#b8c4f2] to-[#7d8fe0]",
  "from-[#a8dcc3] to-[#5cb08a]",
  "from-[#f3d08d] to-[#e2a33c]",
  "from-[#d6bdf0] to-[#a37ad9]",
  "from-[#f2b0c6] to-[#dc6f95]",
  "from-[#a9d8ea] to-[#4fa3c7]",
];

/** A person's photo, or their initials on a gradient picked from their name. */
export function UserAvatar({
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
  return (
    <Avatar
      title={name}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.38) }}
      className={cn("after:hidden", ring && "ring-2 ring-white", className)}
    >
      {src && <AvatarImage src={src} alt={name} className="object-cover" />}
      <AvatarFallback className={cn("bg-linear-to-br font-semibold text-white", TONES[hashString(name) % TONES.length])}>{initials(name)}</AvatarFallback>
    </Avatar>
  );
}
