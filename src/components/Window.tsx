import Link from "next/link";

export type Tone = "mint" | "tang" | "sun" | "cherry" | "leaf" | "peri" | "bubble";

/** Retro desktop window: coloured title bar over a cream body. */
export default function Window({
  title,
  tone = "mint",
  children,
  className = "",
  bodyClassName = "p-4",
  aside,
  href,
}: {
  title: React.ReactNode;
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Extra content on the right of the title bar, e.g. a status badge. */
  aside?: React.ReactNode;
  /** Makes the title and body a link (used for workshop cards). */
  href?: string;
}) {
  const body = <div className={bodyClassName}>{children}</div>;
  return (
    <section className={`win ${className}`}>
      <div className="win-title" data-tone={tone}>
        {href ? (
          <Link href={href} className="truncate hover:underline">{title}</Link>
        ) : (
          <span className="truncate">{title}</span>
        )}
        {aside && <span className="flex shrink-0 items-center gap-3">{aside}</span>}
      </div>
      {href ? <Link href={href} className="block">{body}</Link> : body}
    </section>
  );
}
