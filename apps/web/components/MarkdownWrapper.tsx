"use client";
import MarkdownEditor from "@uiw/react-markdown-editor";
import remarkGfm from "remark-gfm";
import { useTheme } from "@/providers/ThemeProvider";

type Props = { source: string | null | undefined };

export default function MarkdownWrapper({ source }: Props) {
  const normalized = source?.replace(/\r\n?/g, "\n") ?? ""; // CRLF/CR -> LF
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
