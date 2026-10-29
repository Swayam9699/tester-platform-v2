import { Star } from "lucide-react";

export function Stars({ n }: { n: number }) {
  return (
    <span className="flex">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} size={13} className={i < n ? "fill-[#f5b301] text-[#f5b301]" : "text-black/15"} />
      ))}
    </span>
  );
}
