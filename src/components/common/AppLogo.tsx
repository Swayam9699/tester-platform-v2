import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, hashString } from "@/lib/utils";

const LOGO_TONES = ["bg-[#fde2d6] text-[#c3552f]", "bg-[#e3e7fc] text-[#4453c4]", "bg-[#dff3e8] text-[#23794f]", "bg-[#fbecd0] text-[#a46a0b]", "bg-[#efe3fb] text-[#7a45b8]"];

/** An app's icon as a rounded square, or its first letter on a colour picked from its name. */
export function AppLogo({ name, src, size = 44, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  const radius = size * 0.28;
  return (
    <Avatar
      style={{ width: size, height: size, borderRadius: radius, fontSize: size * 0.4 }}
      className={cn("ring-1 ring-black/5 after:hidden", src && "bg-white shadow-sm", className)}
    >
      {src && <AvatarImage src={src} alt="" style={{ borderRadius: radius }} className="object-cover" />}
      <AvatarFallback style={{ borderRadius: radius }} className={cn("font-semibold", LOGO_TONES[hashString(name) % LOGO_TONES.length])}>
        {name.trim()[0]?.toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}
