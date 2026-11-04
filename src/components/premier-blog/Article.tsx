import DraftImage from "./DraftImage";
import type { ReactNode } from "react";
import {
  mediaPattern,
  plainText,
  safeLink,
  type PostInput,
  type RichNode,
} from "@/lib/premier-blog/model";
import styles from "./blog.module.css";
function Rich({ node }: { node: RichNode }) {
  const children = node.content?.map((n, i) => <Rich key={i} node={n} />);
  switch (node.type) {
    case "doc":
      return <>{children}</>;
    case "text": {
      let result: ReactNode = node.text;
      for (const m of node.marks || []) {
        if (m.type === "bold") result = <strong>{result}</strong>;
        else if (m.type === "italic") result = <em>{result}</em>;
        else if (m.type === "strike") result = <s>{result}</s>;
        else if (m.type === "underline") result = <u>{result}</u>;
        else if (m.type === "link" && safeLink(m.attrs?.href))
          result = (
            <a href={m.attrs.href} rel="noopener noreferrer">
              {result}
            </a>
          );
      }
      return <>{result}</>;
    }
    case "paragraph":
      return <p>{children?.length ? children : <br />}</p>;
    case "heading":
      return node.attrs?.level === 3 ? (
        <h3>{children}</h3>
      ) : (
        <h2>{children}</h2>
      );
    case "blockquote":
      return <blockquote>{children}</blockquote>;
    case "bulletList":
      return <ul>{children}</ul>;
    case "orderedList":
      return <ol>{children}</ol>;
    case "listItem":
      return <li>{children}</li>;
    case "hardBreak":
      return <br />;
    case "horizontalRule":
      return <hr />;
    case "image":
      return typeof node.attrs?.src === "string" &&
        mediaPattern.test(node.attrs.src) ? (
        <figure>
          <DraftImage src={node.attrs.src} alt={String(node.attrs.alt || "")} />
        </figure>
      ) : null;
    default:
      return null;
  }
}
export default function Article({
  post,
  date,
}: {
  post: PostInput;
  date?: string | null;
}) {
  const minutes = Math.max(
    1,
    Math.ceil(plainText(post.content).split(/\s+/).length / 200),
  );
  return (
    <article className={styles.article}>
      <header className={styles.articleHeader}>
        <p className={styles.eyebrow}>
          {post.category || "The Premier Journal"}
        </p>
        <h1>{post.title || "Untitled article"}</h1>
        <p className={styles.excerpt}>{post.excerpt}</p>
        <div className={styles.byline}>
          <span>{post.author}</span>
          {date && (
            <time dateTime={date}>
              {new Date(date).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
                timeZone: "UTC",
              })}
            </time>
          )}
          <span>{minutes} min read</span>
        </div>
      </header>
      {post.cover && (
        <DraftImage
          className={styles.cover}
          src={post.cover}
          alt={post.coverAlt}
        />
      )}
      <div className={styles.prose}>
        <Rich node={post.content} />
      </div>
    </article>
  );
}
