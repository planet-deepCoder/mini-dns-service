import { useState } from "react";

type AvatarProps = {
  name: string;
  src: string;
  color?: string;
  size?: number;
};

export function Avatar({ name, src, color = "#215e75", size = 32 }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  if (!src || failed) {
    return (
      <span
        aria-hidden="true"
        className="inline-flex shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
        style={{ width: size, height: size, background: color }}
      >
        {initials}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className="inline-block shrink-0 rounded-full object-cover"
      style={{ width: size, height: size, background: color }}
      onError={() => setFailed(true)}
    />
  );
}
