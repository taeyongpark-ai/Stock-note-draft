type Props = {
  name: string;
  color: string;
  size?: number;
  className?: string;
};

export default function Logo({ name, color, size = 44, className }: Props) {
  const initial = name.slice(0, 1);
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: "9999px",
        background: color,
        color: "white",
        display: "grid",
        placeItems: "center",
        fontWeight: 700,
        fontSize: size * 0.42,
        flexShrink: 0,
        boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.12)",
      }}
      aria-hidden
    >
      {initial}
    </div>
  );
}
