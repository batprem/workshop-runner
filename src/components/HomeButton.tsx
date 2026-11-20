"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** "Back to the first page" button. Hidden when the user is already on their landing page. */
export default function HomeButton({ href }: { href: string }) {
  const pathname = usePathname();
  if (pathname === href) return null;
  return (
    <Link href={href} className="btn btn-sun btn-sm" aria-label="Back to home" title="Home">
      {/* pixel house on an 11x10 grid */}
      <svg viewBox="0 0 11 10" shapeRendering="crispEdges" fill="currentColor" aria-hidden className="h-4 w-auto">
        {[0, 1, 2, 3, 4, 5].map((y) => (
          <rect key={y} x={5 - y} y={y} width={2 * y + 1} height={1} />
        ))}
        <rect x={1} y={6} width={9} height={1} />
        <rect x={1} y={7} width={3} height={3} />
        <rect x={7} y={7} width={3} height={3} />
      </svg>
    </Link>
  );
}
