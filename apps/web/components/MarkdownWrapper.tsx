"use client";
import MarkdownEditor from "@uiw/react-markdown-editor";
import remarkGfm from "remark-gfm";

type Props = { source: string };

export default function MarkdownWrapper({ source }: Props) {
  const normalized = source.replace(/\r\n?/g, "\n"); // CRLF/CR -> LF
  return (
    <div data-color-mode="light">
      <MarkdownEditor.Markdown
        source={normalized}
        remarkPlugins={[remarkGfm]}
      />
    </div>
  );
}
