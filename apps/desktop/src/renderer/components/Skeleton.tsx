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
    <div style={{ display: "grid", gap: 8 }} aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            padding: "12px 14px",
            borderRadius: 12,
            border: "1px solid var(--tek-line)",
            background: "var(--tek-card)",
          }}
        >
          <div style={{ flex: 1, display: "grid", gap: 8 }}>
            <Skeleton height={14} width="55%" radius={6} />
            <Skeleton height={10} width="35%" radius={6} />
          </div>
          <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
            <Skeleton height={14} width={56} radius={6} />
            <Skeleton height={10} width={40} radius={6} />
          </div>
        </div>
      ))}
    </div>
  );
}
