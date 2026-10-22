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

export function SaleHistorySummarySkeleton({ cells = 6 }: { cells?: number }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
        gap: 10,
      }}
      aria-busy="true"
    >
      {Array.from({ length: cells }, (_, i) => (
        <div
          key={i}
          style={{
            display: "grid",
            gap: 8,
            padding: "12px 14px",
            borderRadius: 12,
            border: "1px solid var(--tek-line)",
            background: "var(--tek-card)",
          }}
        >
          <Skeleton height={10} width="45%" radius={4} />
          <Skeleton height={18} width="70%" radius={6} />
        </div>
      ))}
    </div>
  );
}

/** Skeleton liste historique : groupes + lignes tableau. */
export function SaleHistorySkeleton({ groups = 2, rowsPerGroup = 4 }: { groups?: number; rowsPerGroup?: number }) {
  return (
    <div style={{ display: "grid", gap: 18 }} aria-busy="true" aria-live="polite">
      <SaleHistorySummarySkeleton />
      {Array.from({ length: groups }, (_, g) => (
        <section key={g}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              marginBottom: 8,
            }}
          >
            <Skeleton height={16} width={110} radius={6} />
            <Skeleton height={12} width={140} radius={6} />
          </div>
          <div
            style={{
              border: "1px solid var(--tek-line)",
              borderRadius: 14,
              overflow: "hidden",
              background: "var(--tek-card)",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 72px 1.4fr 110px 96px",
                gap: 8,
                padding: "10px 12px",
                borderBottom: "1px solid var(--tek-line)",
                background: "rgba(0,0,0,0.03)",
              }}
            >
              <Skeleton height={10} width="40%" radius={4} />
              <Skeleton height={10} width="70%" radius={4} />
              <Skeleton height={10} width="50%" radius={4} />
              <Skeleton height={10} width="60%" radius={4} style={{ justifySelf: "end" }} />
              <Skeleton height={10} width="55%" radius={4} style={{ justifySelf: "end" }} />
            </div>
            {Array.from({ length: rowsPerGroup }, (_, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.2fr 72px 1.4fr 110px 96px",
                  gap: 8,
                  alignItems: "center",
                  padding: "14px 12px",
                  borderBottom: i < rowsPerGroup - 1 ? "1px solid var(--tek-line)" : undefined,
                }}
              >
                <Skeleton height={14} width={`${55 + ((i * 7) % 30)}%`} radius={6} />
                <Skeleton height={12} width={40} radius={6} />
                <Skeleton height={12} width={`${45 + ((i * 11) % 35)}%`} radius={6} />
                <Skeleton height={14} width={72} radius={6} style={{ justifySelf: "end" }} />
                <Skeleton height={12} width={56} radius={6} style={{ justifySelf: "end" }} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function SaleDetailSkeleton() {
  return (
    <div style={{ display: "grid", gap: 14 }} aria-busy="true" aria-live="polite">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 10,
        }}
      >
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            style={{
              display: "grid",
              gap: 8,
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid var(--tek-line)",
              background: "var(--tek-bg)",
            }}
          >
            <Skeleton height={10} width="40%" radius={4} />
            <Skeleton height={14} width="75%" radius={6} />
          </div>
        ))}
      </div>
      <Skeleton height={14} width={100} radius={6} style={{ marginTop: 4 }} />
      <div
        style={{
          border: "1px solid var(--tek-line)",
          borderRadius: 14,
          overflow: "hidden",
          background: "var(--tek-card)",
        }}
      >
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "1.6fr 56px 88px 96px",
              gap: 10,
              padding: "12px",
              borderBottom: i < 3 ? "1px solid var(--tek-line)" : undefined,
            }}
          >
            <Skeleton height={13} width={`${60 + i * 8}%`} radius={6} />
            <Skeleton height={12} width={28} radius={6} style={{ justifySelf: "end" }} />
            <Skeleton height={12} width={64} radius={6} style={{ justifySelf: "end" }} />
            <Skeleton height={13} width={70} radius={6} style={{ justifySelf: "end" }} />
          </div>
        ))}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 4,
        }}
      >
        <Skeleton height={14} width={60} radius={6} />
        <Skeleton height={22} width={110} radius={6} />
      </div>
    </div>
  );
}
