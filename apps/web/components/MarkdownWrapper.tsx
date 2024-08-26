import React from "react";
import Markdown, { MarkdownToJSX } from "markdown-to-jsx";

type Props = {
  children: string;
  optionsOverride?: MarkdownToJSX.Options;
};

const MarkdownWrapper = ({ children, optionsOverride }: Props) => {
  return (
    <Markdown
      options={{
        disableParsingRawHTML: true,
        overrides: {
          hr: { props: { className: "my-4" } },
          h1: { props: { className: "text-xl font-semibold my-3" } },
          h2: { props: { className: "text-xl font-semibold my-2" } },
          h3: { props: { className: "text-lg font-semibold my-1" } },
          h4: { props: { className: "text-base font-semibold" } },
          h5: { props: { className: "text-sm font-semibold" } },
          h6: { props: { className: "text-xs font-semibold" } },
        },
        ...optionsOverride,
      }}
    >
      {children}
    </Markdown>
  );
};

export default MarkdownWrapper;
