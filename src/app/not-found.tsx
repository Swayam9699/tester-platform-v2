import Link from "next/link";
import { Sparkle } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center p-4 text-center">
      <div>
        <Sparkle size={80} className="mx-auto" />
        <h1 className="mt-4 text-2xl font-semibold">Page not found</h1>
        <Link href="/dashboard" className="btn btn-dark mt-6">
          Back home
        </Link>
      </div>
    </div>
  );
}
