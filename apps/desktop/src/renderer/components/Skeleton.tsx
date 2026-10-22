import type { CSSProperties } from "react";

export function Skeleton({
  height = 48,
  width = "100%",
  radius = 12,
  style,
}: {
  height?: number | string;
  width?: number | string;
  radius?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      className="tek-skeleton"
      aria-hidden
      style={{
        height,
        width,
        borderRadius: radius,
        ...style,
      }}
    />
  );
}

export function ProductListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
        gap: 12,
      }}
      aria-busy="true"
      aria-live="polite"
    >
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          style={{
            display: "grid",
            gap: 10,
            padding: 14,
            borderRadius: 14,
            border: "1px solid var(--tek-line)",
            background: "var(--tek-card)",
            minHeight: 118,
          }}
        >
          <Skeleton height={16} width="80%" radius={6} />
          <Skeleton height={10} width="50%" radius={6} />
          <Skeleton height={18} width="40%" radius={6} style={{ marginTop: "auto" }} />
        </div>
      ))}
    </div>
  );
}
