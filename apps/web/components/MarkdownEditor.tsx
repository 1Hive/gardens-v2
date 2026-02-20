"use client";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
} from "@heroicons/react/24/solid";
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
  type MDXEditorMethods,
} from "@mdxeditor/editor";

import { useTheme } from "@/providers/ThemeProvider";
import { ipfsFileUpload } from "@/utils/ipfsUtils";

export type MarkdownEditorHandle = {
  focus: () => void;
};

type MarkdownEditorProps = {
  id: string;
  value: string | undefined;
  className?: string;
  errors?: Record<string, string>;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  disabled?: boolean;
  readOnly?: boolean;
  testId?: string;
} & Omit<React.ComponentProps<typeof MDXEditor>, "onChange" | "markdown">;

const MarkdownEditor = forwardRef<MarkdownEditorHandle, MarkdownEditorProps>(
  function MarkdownEditor(
    {
      id,
      value,
      onChange,
      className,
      errors,
      disabled = false,
      readOnly = false,
      testId,
      ...rest
    },
    ref,
  ) {
    const wrapRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<MDXEditorMethods | null>(null);
    const [isFs, setIsFs] = useState(false);
    const [usingFallback, setUsingFallback] = useState(false);
    const { resolvedTheme } = useTheme();
    const isFullscreenActive = isFs || usingFallback;

    // helpers
    const getFsEl = () =>
      // @ts-ignore
      !!document.fullscreenElement || document.webkitFullscreenElement;

    const requestFs = async (el: HTMLElement) => {
      // @ts-ignore
      const req = el.requestFullscreen ?? el.webkitRequestFullscreen;
      if (typeof req !== "function") {
        throw new Error("Fullscreen API not available");
      }
      return req.call(el);
    };

    const exitFs = async () => {
      // @ts-ignore
      const exit = document.exitFullscreen ?? document.webkitExitFullscreen;
      return exit?.call(document);
    };

    const closeFs = useCallback(async () => {
      if (usingFallback) {
        setUsingFallback(false);
        setIsFs(false);
        return;
      }
      if (getFsEl()) {
        try {
          await exitFs();
        } catch {
          // ignore -> fallback to local state reset
        }
      }
      setIsFs(false);
    }, [usingFallback]);

    // effect: listen to both standard + webkit events and elements
    useEffect(() => {
      const onFsChange = () => setIsFs(Boolean(getFsEl()));
      document.addEventListener("fullscreenchange", onFsChange);
      // @ts-ignore
      document.addEventListener("webkitfullscreenchange", onFsChange);
      return () => {
        document.removeEventListener("fullscreenchange", onFsChange);
        // @ts-ignore
        document.removeEventListener("webkitfullscreenchange", onFsChange);
      };
    }, []);

    useEffect(() => {
      const popup = document.querySelector<HTMLElement>(
        ".mdxeditor-popup-container",
      );
      if (!popup) return;

      const host = wrapRef.current ?? document.body;
      const originalParent = popup.parentElement ?? document.body;

      if (isFullscreenActive) {
        // move popups inside the fullscreen subtree
        host.appendChild(popup);
      } else {
        // restore to body when exiting
        if (originalParent !== document.body) document.body.appendChild(popup);
      }
    }, [isFullscreenActive]);

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

    useEffect(() => {
      const handleKeyPress = (event: KeyboardEvent) => {
        if (event.key === "Escape" && isFullscreenActive) {
          event.stopPropagation();
          void closeFs();
        }
      };
      document.addEventListener("keydown", handleKeyPress);
      return () => document.removeEventListener("keydown", handleKeyPress);
    }, [closeFs, isFullscreenActive]);

    const toggleFs = async () => {
      const el = wrapRef.current!;
      try {
        if (isFullscreenActive) {
          await closeFs();
          return;
        }
        const hasNativeApi =
          // @ts-ignore
          (document.fullscreenEnabled ?? document.webkitFullscreenEnabled) &&
          Boolean(
            // @ts-ignore
            el.requestFullscreen ?? el.webkitRequestFullscreen,
          );
        if (hasNativeApi) {
          await requestFs(el);
          setUsingFallback(false);
          setIsFs(true);
        } else {
          // CSS fallback for iOS without native FS
          setUsingFallback(true);
          setIsFs(true);
        }
      } catch {
        // if native fails, fallback off
        setUsingFallback(true);
        setIsFs(true);
      }
    };

    const focusEditor = useCallback(() => {
      editorRef.current?.focus(undefined, { defaultSelection: "rootEnd" });
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        focus: focusEditor,
      }),
      [focusEditor],
    );

    const handleShellMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
      if (!editorRef.current) return;
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const isToolbarClick = target.closest(".mdxeditor-toolbar");
      const isPopupClick = target.closest(".mdxeditor-popup-container");
      if (isToolbarClick != null || isPopupClick != null) return;
      const isWithinContent = target.closest(".mdxeditor-root-contenteditable");
      if (!isWithinContent) {
        event.preventDefault();
        focusEditor();
      }
    };

    const handleShellFocus = (event: React.FocusEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) {
        focusEditor();
      }
    };

    return (
      <div
        ref={wrapRef}
        className={`relative ${readOnly || disabled ? "!bg-transparent dark:!bg-primary-soft-dark opacity-40" : "bg-neutral"} rounded-2xl`}
      >
        <div
          className={`markdown-editor-shell p-2 min-h-60 rounded-2xl border ${
            id && errors?.[id] ? "input-error" : "input-info"
          } ${className ?? ""} ${
            disabled ?
              "!border-gray-400 cursor-not-allowed !bg-transparent dark:!bg-primary-soft-dark"
            : ""
          } ${
            isFullscreenActive ?
              "markdown-editor-shell--fullscreen"
            : "resize-y overflow-auto"
          }`}
          id={id}
          tabIndex={-1}
          onMouseDown={handleShellMouseDown}
          onFocus={handleShellFocus}
          data-testid={testId}
        >
          <MDXEditor
            ref={editorRef}
            markdown={value ?? ""}
            readOnly={readOnly || disabled}
            className={`rounded-2xl !h-full mdxeditor-theme ${resolvedTheme === "darkTheme" ? "dark-theme dark-editor" : ""} ${
              readOnly || disabled ?
                "pointer-events-none !bg-transparent dark:!bg-primary-soft-dark"
              : ""
            }`}
            {...rest}
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
                toolbarClassName: "",
                toolbarContents: () =>
                  !readOnly && !disabled ?
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
                              when: (editor) =>
                                editor?.editorType === "codeblock",
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
                  : <div className="bg-transparent" />,
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
  },
);

export default MarkdownEditor;
