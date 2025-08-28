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
  registerKey,
  value,
  onChange,
  className,
  errors,
  ...rest
}: {
  registerKey: string;
  value: string;
  className?: string;
  errors?: any;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
} & Omit<React.ComponentProps<typeof MDXEditor>, "onChange" | "markdown">) {
  // const localRef = useRef<MDXEditorMethods>(null);

  // // keep editor in sync if outer value changes (form reset, etc.)
  // useEffect(() => {
  //   localRef.current?.setMarkdown(markdown ?? "");
  // }, [markdown]);

  return (
    <div
      className={`p-2 resize-y overflow-auto min-h-60 rounded-2xl border ${
        registerKey && errors?.[registerKey] ? "input-error" : "input-info"
      } ${className}`}
      style={{ minHeight: 200 }}
    >
      <MDXEditor
        markdown={value ?? ""}
        className="rounded-2xl !h-full"
        // ref={(inst) => {
        //   localRef.current = inst!;
        //   if (typeof editorRef === "function") editorRef(inst!);
        //   else if (editorRef && "current" in editorRef) editorRef.current = inst!;
        // }}
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
              name: registerKey,
            } as HTMLInputElement,
          } as React.ChangeEvent<HTMLInputElement>;

          onChange?.(syntheticEvent);
        }}
        {...rest}
      />
    </div>
  );
}
