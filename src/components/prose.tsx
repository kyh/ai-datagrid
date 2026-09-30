import { Fragment } from "react";
import type { ReactNode } from "react";
import Link from "next/link";

import type { ProseBlock, ProseListItem, ProsePage } from "@/lib/agent/site-content";

const withInlineCode = (text: string): ReactNode =>
  text.split("`").map((segment, index) =>
    index % 2 === 1 ? (
      <code key={index} className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
        {segment}
      </code>
    ) : (
      <Fragment key={index}>{segment}</Fragment>
    ),
  );

const linkClassName = "text-foreground underline underline-offset-4 hover:text-primary";

/** `untabbable` is for links inside visually hidden blocks, so keyboard focus never lands on something invisible. */
type LinkFocus = "tabbable" | "untabbable";

/** Files like `/llms.txt` aren't App Router pages, so they skip `<Link>` along with off-site URLs. */
const ProseLink = ({
  href,
  children,
  focus,
}: {
  href: string;
  children: ReactNode;
  focus: LinkFocus;
}) => {
  const tabIndex = focus === "untabbable" ? -1 : undefined;
  return href.startsWith("/") && !href.includes(".") ? (
    <Link
      className={linkClassName}
      href={href}
      prefetch={focus === "untabbable" ? false : undefined}
      tabIndex={tabIndex}
    >
      {children}
    </Link>
  ) : (
    <a className={linkClassName} href={href} tabIndex={tabIndex}>
      {children}
    </a>
  );
};

export const ProseList = ({
  items,
  focus = "tabbable",
}: {
  items: ProseListItem[];
  focus?: LinkFocus;
}) => (
  <ul className="flex list-disc flex-col gap-2 pl-5">
    {items.map((item) => (
      <li key={item.label}>
        {item.href ? (
          <ProseLink href={item.href} focus={focus}>
            {item.label}
          </ProseLink>
        ) : (
          <span className="text-foreground">{item.label}</span>
        )}
        {item.text ? <> — {withInlineCode(item.text)}</> : null}
      </li>
    ))}
  </ul>
);

export const ProseParagraph = ({ text }: { text: string }) => <p>{withInlineCode(text)}</p>;

const ProseBlockView = ({ block }: { block: ProseBlock }) => {
  if (block.kind === "heading") {
    return <h2 className="mt-4 text-lg text-foreground">{block.text}</h2>;
  }
  if (block.kind === "list") {
    return <ProseList items={block.items} />;
  }
  return <ProseParagraph text={block.text} />;
};

export const ProsePageView = ({ page }: { page: ProsePage }) => (
  <main className="flex max-w-3xl flex-col gap-4 overflow-y-auto p-8 [grid-area:main] lg:p-16">
    <h1 className="text-3xl leading-snug">{page.heading}</h1>
    <div className="flex flex-col gap-4 border-t pt-4 leading-relaxed text-muted-foreground">
      {page.blocks.map((block, index) => (
        <ProseBlockView key={index} block={block} />
      ))}
    </div>
  </main>
);
