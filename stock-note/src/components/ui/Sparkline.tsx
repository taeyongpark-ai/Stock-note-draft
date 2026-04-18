type Props = {
  points: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
};

export default function Sparkline({
  points,
  width = 120,
  height = 40,
  color,
  className,
}: Props) {
  if (!points.length) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = width / (points.length - 1 || 1);
  const d = points
    .map((p, i) => {
      const x = i * step;
      const y = height - ((p - min) / span) * height;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const up = points[points.length - 1] >= points[0];
  const stroke = color ?? (up ? "var(--up)" : "var(--down)");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      width={width}
      height={height}
      preserveAspectRatio="none"
    >
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
