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
  StrikeThroughSupSubToggles,
  ButtonWithTooltip,
  diffSourcePlugin,
  linkDialogPlugin,
  CreateLink,
  DiffSourceToggleWrapper,
} from "@mdxeditor/editor";
import { ipfsFileUpload } from "@/utils/ipfsUtils";
import "@mdxeditor/editor/style.css";
import { useRef, useState, useEffect } from "react";
import {
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
} from "@heroicons/react/24/solid";
import { useTheme } from "@/providers/ThemeProvider";

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
  const [usingFallback, setUsingFallback] = useState(false);
  const { resolvedTheme } = useTheme();

  const canNativeFs = () =>
    typeof document !== "undefined" &&
    // @ts-ignore safari old
    (document.fullscreenEnabled || document.webkitFullscreenEnabled) &&
    !!wrapRef.current &&
    // @ts-ignore safari old
    (wrapRef.current.requestFullscreen ||
      (wrapRef.current as any).webkitRequestFullscreen);

  useEffect(() => {
    const onFsChange = () => setIsFs(Boolean(document.fullscreenElement));
    const onFsError = () => setIsFs(false);

    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("fullscreenerror", onFsError);
    // Safari legacy events
    // @ts-ignore
    document.addEventListener("webkitfullscreenchange", onFsChange);
    // @ts-ignore
    document.addEventListener("webkitfullscreenerror", onFsError);

    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("fullscreenerror", onFsError);
      // @ts-ignore
      document.removeEventListener("webkitfullscreenchange", onFsChange);
      // @ts-ignore
      document.removeEventListener("webkitfullscreenerror", onFsError);
    };
  }, []);

  useEffect(() => {
    const popup = document.querySelector<HTMLElement>(
      ".mdxeditor-popup-container",
    );
    if (!popup) return;

    const host = wrapRef.current ?? document.body;
    const originalParent = popup.parentElement ?? document.body;

    if (isFs || usingFallback) {
      // move popups inside the fullscreen subtree
      host.appendChild(popup);
    } else {
      // restore to body when exiting
      if (originalParent !== document.body) document.body.appendChild(popup);
    }
  }, [isFs, usingFallback]);

  // Lock body scroll when using CSS fallback
  useEffect(() => {
    if (usingFallback) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [usingFallback]);

  const toggleFs = async () => {
    const el = wrapRef.current!;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setUsingFallback(false);
        return;
      }
      if (canNativeFs()) {
        // @ts-ignore
        const req = el.requestFullscreen || el.webkitRequestFullscreen;
        await req.call(el);
        setUsingFallback(false);
      } else {
        // CSS fallback for iOS / restricted contexts
        setUsingFallback(true);
        setIsFs(true);
      }
    } catch {
      // If native request fails (Safari quirks), use fallback
      setUsingFallback(true);
      setIsFs(true);
    }
  };

  // Exit for CSS fallback
  const exitFallback = () => {
    setUsingFallback(false);
    setIsFs(false);
  };

  return (
    <div ref={wrapRef} className="relative bg-neutral">
      <div
        className={`p-2 resize-y overflow-auto min-h-60 rounded-2xl border ${
          id && errors?.[id] ? "input-error" : "input-info"
        } ${className} ${isFs ? "fixed inset-0 z-50 m-4" : ""}`}
      >
        <MDXEditor
          markdown={value ?? ""}
          className={`rounded-2xl !h-full ${resolvedTheme === "darkTheme" ? "dark-theme dark-editor" : ""}`}
          plugins={[
            headingsPlugin({
              allowedHeadingLevels: [1, 2, 3, 4, 5, 6],
            }),
            quotePlugin(),
            thematicBreakPlugin(),
            tablePlugin(),
            linkPlugin(),
            linkDialogPlugin(),
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
                return `${location.protocol}//${location.hostname}${location.port ? `:${location.port}` : ""}/api/ipfs/${hash}`;
              },
            }),
            toolbarPlugin({
              toolbarClassName: ``,
              toolbarContents: () => (
                <>
                  <DiffSourceToggleWrapper>
                    <UndoRedo />
                    <Separator />
                    <BoldItalicUnderlineToggles />
                    <Separator />
                    <ListsToggle />
                    <Separator />
                    <CodeToggle />
                    <StrikeThroughSupSubToggles />
                    <Separator />
                    <InsertThematicBreak />
                    <InsertTable />
                    <CreateLink />
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
                    <Separator />
                    <BlockTypeSelect />
                  </DiffSourceToggleWrapper>
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
            diffSourcePlugin({
              viewMode: "rich-text",
            }),
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
