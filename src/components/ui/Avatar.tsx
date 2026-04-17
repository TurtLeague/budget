interface AvatarProps {
  displayName: string;
  avatarColor: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
}

const sizes = { sm: "w-8 h-8 text-sm", md: "w-10 h-10 text-base", lg: "w-16 h-16 text-2xl" };

export default function Avatar({ displayName, avatarColor, avatarUrl, size = "md" }: AvatarProps) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={displayName}
        className={`${sizes[size]} rounded-full object-cover flex-shrink-0`}
      />
    );
  }
  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}
      style={{ backgroundColor: avatarColor }}
    >
      {displayName?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}
