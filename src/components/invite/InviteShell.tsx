import Link from "next/link";
import { LogoMark } from "@/components/common";
import { APP_NAME } from "@/lib/config";

export function InviteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center p-4">
      <div className="glass-shell w-full max-w-[460px] rounded-[28px] p-6 sm:p-8">
        <Link href="/" className="mb-6 flex items-center gap-2">
          <LogoMark />
          <span className="font-semibold">{APP_NAME.toUpperCase()}</span>
        </Link>
        {children}
      </div>
    </div>
  );
}
