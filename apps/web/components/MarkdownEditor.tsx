"use client";
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  toolbarPlugin,
  BoldItalicUnderlineToggles,
  UndoRedo,
  BlockTypeSelect,
  Separator,
  InsertTable,
  InsertImage,
  tablePlugin,
  imagePlugin,
  linkPlugin,
  ListsToggle,
  codeBlockPlugin,
  CodeToggle,
  codeMirrorPlugin,
  ConditionalContents,
  InsertCodeBlock,
  ChangeCodeMirrorLanguage,
  InsertThematicBreak,
} from "@mdxeditor/editor";
import { ipfsFileUpload } from "@/utils/ipfsUtils";
import "@mdxeditor/editor/style.css";

export default function MarkdownEditor({
  id,
  value,
  onChange,
  className,
  errors,
  ...rest
}: {
  id: string;
  value: string | undefined;
  className?: string;
  errors?: Record<string, string>;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
} & Omit<React.ComponentProps<typeof MDXEditor>, "onChange" | "markdown">) {
  return (
    <div
      className={`p-2 resize-y overflow-auto min-h-60 rounded-2xl border ${
        id && errors?.[id] ? "input-error" : "input-info"
      } ${className}`}
      style={{ minHeight: 200 }}
    >
      <MDXEditor
        markdown={value ?? ""}
        className="rounded-2xl !h-full"
        plugins={[
          headingsPlugin({
            allowedHeadingLevels: [1, 2, 3, 4, 5, 6],
          }),
          quotePlugin(),
          thematicBreakPlugin(),
          tablePlugin(),
          linkPlugin(),
          codeBlockPlugin({ defaultCodeBlockLanguage: "js" }),
          codeMirrorPlugin({
            codeBlockLanguages: {
              js: "JavaScript",
              ts: "TypeScript",
              css: "CSS",
              txt: "Text",
              html: "HTML",
            },
          }),
          imagePlugin({
            imageUploadHandler: async (x) => {
              const hash = await ipfsFileUpload(x);
              return `https://${process.env.NEXT_PUBLIC_IPFS_GATEWAY}/ipfs/${hash}?pinataGatewayToken=${process.env.NEXT_PUBLIC_PINATA_KEY}`;
            },
          }),
          toolbarPlugin({
            toolbarClassName: "my-classname",
            toolbarContents: () => (
              <>
                <UndoRedo />
                <Separator />
                <BoldItalicUnderlineToggles />
                <CodeToggle />
                <Separator />
                <ListsToggle />
                <Separator />
                <BlockTypeSelect />
                <Separator />
                <InsertThematicBreak />
                <InsertTable />
                <InsertImage />
                <Separator />
                <ConditionalContents
                  options={[
                    {
                      when: (editor) => editor?.editorType === "codeblock",
                      contents: () => <ChangeCodeMirrorLanguage />,
                    },
                    {
                      fallback: () => (
                        <>
                          <InsertCodeBlock />
                        </>
                      ),
                    },
                  ]}
                />
              </>
            ),
          }),
          listsPlugin(),
          markdownShortcutPlugin(),
        ]}
        onChange={(md) => {
          const syntheticEvent = {
            target: {
              value: md,
              name: id,
            } as HTMLInputElement,
          } as React.ChangeEvent<HTMLInputElement>;
          onChange?.(syntheticEvent);
        }}
        {...rest}
      />
    </div>
  );
}
