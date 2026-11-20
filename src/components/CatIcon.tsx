// Pixel-art orange tabby face, drawn on a 14x12 grid to match the retro theme.
const ROWS = [
  ".KK........KK.",
  "KOOK......KOOK",
  "KOPOKKKKKKOPOK",
  "KOOOODOODOOOOK",
  "KOOOODOODOOOOK",
  "KOOKOOOOOOKOOK",
  "KOOKOOOOOOKOOK",
  "KOOOWWWWWWOOOK",
  "KOOWWWPPWWWOOK",
  "KOOWWKWWKWWOOK",
  ".KOOWWWWWWOOK.",
  "..KKKKKKKKKK..",
];

const FILL: Record<string, string> = {
  K: "var(--color-ink)",
  O: "var(--color-tang)",
  D: "#c9621f", // tabby stripes
  W: "var(--color-paper)",
  P: "var(--color-bubble)",
};

export default function CatIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 14 12"
      shapeRendering="crispEdges"
      aria-hidden
      className={`h-7 w-auto shrink-0 ${className}`}
    >
      {ROWS.flatMap((row, y) =>
        [...row].map((c, x) =>
          c === "." ? null : (
            <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={FILL[c]} />
          ),
        ),
      )}
    </svg>
  );
}
