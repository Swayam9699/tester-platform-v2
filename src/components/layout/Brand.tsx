"use client";

import Link from "next/link";
import { LogoMark } from "@/components/common";
import { APP_NAME } from "@/lib/config";

export function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2">
      <LogoMark />
      <span className="text-[17px] font-semibold tracking-tight">{APP_NAME.toUpperCase()}</span>
    </Link>
  );
}
