"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { Bold, Heading2, Heading3, Italic, LinkIcon, List, ListOrdered, Quote, Redo2, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";

function ToolbarButton({ active, onClick, label, children }: { active?: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} aria-pressed={active} onClick={onClick} className={cn("inline-flex size-8 items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white", active && "bg-brand/25 text-white")}>
      {children}
    </button>
  );
}

/** Rich text with a restricted schema. HTML is sanitized again server-side on save and at render. */
export function RichTextEditor({ value, onChange, label }: { value: string; onChange: (html: string) => void; label: string }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, codeBlock: false, code: false, horizontalRule: false, strike: false, link: false, underline: false }),
      Link.configure({ openOnClick: false, autolink: true, protocols: ["http", "https", "mailto"], HTMLAttributes: { rel: "noopener noreferrer nofollow" } }),
    ],
    content: value,
    immediatelyRender: false,
    editorProps: { attributes: { class: "prose-ng min-h-48 rounded-b-md px-4 py-3 outline-none", "aria-label": label } },
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? "" : e.getHTML()),
  });
  if (!editor) return <div className="field h-60 animate-pulse" aria-busy />;

  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL (https://…)", prev ?? "https://");
    if (url === null) return;
    if (url === "") return void editor.chain().focus().unsetLink().run();
    if (!/^(https?:|mailto:)/i.test(url)) return void window.alert("Only http, https and mailto links are allowed.");
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div className="overflow-hidden rounded-md border border-white/15 bg-white/[0.03] focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/40">
      <div className="flex flex-wrap gap-0.5 border-b border-white/10 bg-white/[0.03] p-1.5" role="toolbar" aria-label="Formatting">
        <ToolbarButton label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="size-4" /></ToolbarButton>
        <ToolbarButton label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="size-4" /></ToolbarButton>
        <ToolbarButton label="Heading" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="size-4" /></ToolbarButton>
        <ToolbarButton label="Subheading" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className="size-4" /></ToolbarButton>
        <ToolbarButton label="Bulleted list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="size-4" /></ToolbarButton>
        <ToolbarButton label="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="size-4" /></ToolbarButton>
        <ToolbarButton label="Quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="size-4" /></ToolbarButton>
        <ToolbarButton label="Link" active={editor.isActive("link")} onClick={setLink}><LinkIcon className="size-4" /></ToolbarButton>
        <span className="mx-1 w-px bg-white/10" />
        <ToolbarButton label="Undo" onClick={() => editor.chain().focus().undo().run()}><Undo2 className="size-4" /></ToolbarButton>
        <ToolbarButton label="Redo" onClick={() => editor.chain().focus().redo().run()}><Redo2 className="size-4" /></ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
