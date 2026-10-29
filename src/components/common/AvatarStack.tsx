import { UserAvatar } from "./UserAvatar";

export function AvatarStack({ people, size = 26 }: { people: { name: string; avatarUrl?: string | null }[]; size?: number }) {
  return (
    <div className="flex -space-x-1.5">
      {people.map((p, i) => (
        <UserAvatar key={i} name={p.name} src={p.avatarUrl} size={size} />
      ))}
    </div>
  );
}
