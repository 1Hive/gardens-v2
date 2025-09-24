"use client";
import { useTheme } from "@/providers/ThemeProvider";
import MarkdownEditor from "@uiw/react-markdown-editor";
import remarkGfm from "remark-gfm";

type Props = { source: string };

export default function MarkdownWrapper({ source }: Props) {
  const normalized = source.replace(/\r\n?/g, "\n"); // CRLF/CR -> LF
  const { resolvedTheme } = useTheme();
  return (
    <div data-color-mode={resolvedTheme === "darkTheme" ? "dark" : "light"}>
      <MarkdownEditor.Markdown
        source={normalized}
        remarkPlugins={[remarkGfm]}
      />
    </div>
  );
}
