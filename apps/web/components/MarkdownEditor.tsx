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
  Button,
  StrikeThroughSupSubToggles,
  ButtonWithTooltip,
} from "@mdxeditor/editor";
import { ipfsFileUpload } from "@/utils/ipfsUtils";
import "@mdxeditor/editor/style.css";
import { useRef, useState, useEffect } from "react";
import {
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
} from "@heroicons/react/24/solid";

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
  const wrapRef = useRef<HTMLDivElement>(null);
  const [isFs, setIsFs] = useState(false);
  useEffect(() => {
    const onFsChange = () => setIsFs(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const toggleFs = async () => {
    const el = wrapRef.current!;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await el.requestFullscreen(); // must be user-initiated
  };

  return (
    <div ref={wrapRef} className="relative bg-neutral">
      <div
        className={`p-2 resize-y overflow-auto min-h-60 rounded-2xl border ${
          id && errors?.[id] ? "input-error" : "input-info"
        } ${className} ${isFs ? "fixed inset-0 z-50 m-4 bg-neutral" : ""}`}
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
                  <StrikeThroughSupSubToggles />
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
                  <div className="ml-auto">
                    <ButtonWithTooltip
                      title="Toggle fullscreen"
                      onClick={toggleFs}
                      aria-label="Toggle fullscreen"
                    >
                      {isFs ?
                        <ArrowsPointingInIcon width={24} height={24} />
                      : <ArrowsPointingOutIcon width={24} height={24} />}
                    </ButtonWithTooltip>
                  </div>
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
    </div>
  );
}
