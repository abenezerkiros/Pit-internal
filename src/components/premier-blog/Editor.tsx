"use client";
import { useEditor, EditorContent } from "@tiptap/react";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import DraftImage from "./DraftImage";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { useState, useEffect } from "react";
import { safeLink, type RichNode } from "@/lib/premier-blog/model";
import styles from "./blog.module.css";
export default function Editor({
  content,
  onChange,
  onImage,
  disabled,
}: {
  content: RichNode;
  onChange: (doc: RichNode) => void;
  onImage: () => void;
  disabled: boolean;
}) {
  const [link, setLink] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
        code: false,
        link: { openOnClick: false, autolink: false },
      }),
      Image.extend({
        addNodeView() {
          return ReactNodeViewRenderer(({ node }) => (
            <NodeViewWrapper>
              <DraftImage
                src={String(node.attrs.src)}
                alt={String(node.attrs.alt || "")}
              />
            </NodeViewWrapper>
          ));
        },
      }).configure({ allowBase64: false }),
    ],
    content,
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    editable: !disabled,
    onUpdate: ({ editor }) => onChange(editor.getJSON() as RichNode),
    editorProps: {
      attributes: { "aria-label": "Article content", class: styles.editorBody },
    },
  });
  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);
  if (!editor) return <p>Loading editor…</p>;
  // Image picker callback uses the editor's insertion method through a DOM event scoped to this form.
  const button = (label: string, fn: () => void, active = false) => (
    <button
      key={label}
      type="button"
      disabled={disabled}
      aria-pressed={active}
      onClick={fn}
    >
      {label}
    </button>
  );
  return (
    <div className={styles.editor}>
      <div
        className={styles.toolbar}
        role="toolbar"
        aria-label="Text formatting"
      >
        {button(
          "Bold",
          () => {
            editor.chain().focus().toggleBold().run();
          },
          editor.isActive("bold"),
        )}
        {button(
          "Italic",
          () => {
            editor.chain().focus().toggleItalic().run();
          },
          editor.isActive("italic"),
        )}
        {button(
          "H2",
          () => {
            editor.chain().focus().toggleHeading({ level: 2 }).run();
          },
          editor.isActive("heading", { level: 2 }),
        )}
        {button(
          "H3",
          () => {
            editor.chain().focus().toggleHeading({ level: 3 }).run();
          },
          editor.isActive("heading", { level: 3 }),
        )}
        {button(
          "Bullets",
          () => {
            editor.chain().focus().toggleBulletList().run();
          },
          editor.isActive("bulletList"),
        )}
        {button(
          "Numbers",
          () => {
            editor.chain().focus().toggleOrderedList().run();
          },
          editor.isActive("orderedList"),
        )}
        {button(
          "Quote",
          () => {
            editor.chain().focus().toggleBlockquote().run();
          },
          editor.isActive("blockquote"),
        )}
        {button(
          "Link",
          () => {
            setLink(String(editor.getAttributes("link").href || ""));
            setLinkOpen(!linkOpen);
          },
          editor.isActive("link"),
        )}
        {button("Image", onImage)}
        {button("Undo", () => {
          editor.chain().focus().undo().run();
        })}
        {button("Redo", () => {
          editor.chain().focus().redo().run();
        })}
      </div>
      {linkOpen && (
        <div className={styles.linkRow}>
          <input
            aria-label="Link URL"
            placeholder="https://…"
            value={link}
            onChange={(e) => setLink(e.target.value)}
          />
          <button
            type="button"
            disabled={!safeLink(link)}
            onClick={() => {
              editor
                .chain()
                .focus()
                .extendMarkRange("link")
                .setLink({ href: link })
                .run();
              setLinkOpen(false);
            }}
          >
            Apply
          </button>
          <button
            type="button"
            onClick={() => {
              editor.chain().focus().unsetLink().run();
              setLinkOpen(false);
            }}
          >
            Remove link
          </button>
        </div>
      )}
      <EditorContent editor={editor} />
      <ImageBridge editor={editor} />
    </div>
  );
}
import type { Editor as EditorType } from "@tiptap/react";
function ImageBridge({ editor }: { editor: EditorType }) {
  useEffect(() => {
    const node = editor.view.dom;
    const listener = (event: Event) => {
      const { url, alt } = (event as CustomEvent<{ url: string; alt: string }>)
        .detail;
      editor.chain().focus().setImage({ src: url, alt }).run();
    };
    node.addEventListener("premier-blog-image", listener);
    return () => node.removeEventListener("premier-blog-image", listener);
  }, [editor]);
  return null;
}
