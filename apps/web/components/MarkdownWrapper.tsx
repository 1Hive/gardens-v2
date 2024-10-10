import React from "react";
import MarkdownEditor, {
  MarkdownPreviewProps,
} from "@uiw/react-markdown-editor";

type Props = {
  children: string;
  optionsOverride?: MarkdownPreviewProps;
};

const MarkdownWrapper = ({ children, optionsOverride }: Props) => {
  return (
    <div data-color-mode="light">
      <MarkdownEditor.Markdown
        source={children.replace(/\n/g, "\n\r")}
        {...optionsOverride}
      />
    </div>
  );
};

export default MarkdownWrapper;
