"use client";

interface AvatarProps {
  name: string;
  src?: string;
  status?: "online" | "offline" | "away" | "dnd";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  isPremium?: boolean;
  showStatus?: boolean;
  onClick?: () => void;
  storyRing?: boolean;
  storyViewed?: boolean;
}

const sizes = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-16 h-16 text-xl",
};

const statusDots = {
  xs: "w-1.5 h-1.5 ring-1",
  sm: "w-2 h-2 ring-[1.5px]",
  md: "w-2.5 h-2.5 ring-2",
  lg: "w-3 h-3 ring-2",
  xl: "w-3.5 h-3.5 ring-2",
};

const colors = ["bg-sky-600", "bg-emerald-600", "bg-violet-600", "bg-amber-600", "bg-rose-600", "bg-teal-600", "bg-indigo-600", "bg-pink-600"];

function hashColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

const statusColors: Record<string, string> = { online: "bg-[#00D46A]", offline: "bg-[#5C4D87]", away: "bg-amber-400", dnd: "bg-red-400" };

export default function Avatar({ name, src, status, size = "md", isPremium, showStatus = true, onClick, storyRing, storyViewed }: AvatarProps) {
  const initial = name.charAt(0).toUpperCase();
  const ringClass = storyRing
    ? storyViewed
      ? "ring-2 ring-[var(--text-tertiary)] ring-offset-2 ring-offset-[var(--bg-sidebar)]"
      : "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg-sidebar)]"
    : "";

  return (
    <div className={`relative inline-flex shrink-0 ${onClick ? "cursor-pointer" : ""}`} onClick={onClick}>
      {src ? (
        <img src={src} alt={name} className={`${sizes[size]} rounded-full object-cover ${ringClass}`} />
      ) : (
        <div className={`${sizes[size]} ${hashColor(name)} flex items-center justify-center rounded-full font-semibold text-white ${ringClass}`}>
          {initial}
        </div>
      )}
      {showStatus && status && (
        <span className={`absolute right-0 bottom-0 block ${statusDots[size]} rounded-full ring-[var(--bg-sidebar)] ${statusColors[status]}`} />
      )}
      {isPremium && (
        <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] text-white" style={{ background: "linear-gradient(135deg, #6C3DE8, #00D46A)" }}>&#x2B50;</span>
      )}
    </div>
  );
}
