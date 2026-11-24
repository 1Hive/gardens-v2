import { createElement } from "react";
import MarkdownEditor from "@uiw/react-markdown-editor";
import { renderToStaticMarkup } from "react-dom/server";
import remarkGfm from "remark-gfm";
import { describe, expect, it } from "vitest";
import { markdownRehypePlugins, markdownUrlTransform } from "./markdownSecurity";

function renderMarkdown(source: string) {
  return renderToStaticMarkup(
    createElement(MarkdownEditor.Markdown, {
      source,
      remarkPlugins: [remarkGfm],
      rehypePlugins: markdownRehypePlugins,
      urlTransform: markdownUrlTransform,
    }),
  );
}

describe("MarkdownWrapper", () => {
  it("reproduces the unsafe upstream default as a control", () => {
    const html = renderToStaticMarkup(
      createElement(MarkdownEditor.Markdown, {
        source:
          '<iframe srcdoc="<script>window.parent.test()</script>"></iframe>\n\n[Open](javascript:window.test())',
      }),
    );

    expect(html).toContain("<iframe");
    expect(html).toContain("javascript:");
  });

  it("removes active HTML and unsafe links from untrusted markdown", () => {
    const html = renderMarkdown(
      '<iframe srcdoc="<script>window.parent.test()</script>"></iframe>\n\n[Open](javascript:window.test())\n\n<a href="javascript:window.test()">Raw link</a>',
    );

    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("srcdoc");
    expect(html).not.toContain("javascript:");
    expect(html).toContain("Open");
    expect(html).toContain("Raw link");
  });

  it("preserves ordinary markdown and safe links", () => {
    const html = renderMarkdown("**Safe** [link](https://example.com)\n\n- list item");

    expect(html).toContain("<strong>Safe</strong>");
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain("<li>list item</li>");
  });
});
