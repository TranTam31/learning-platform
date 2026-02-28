"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Block, BlockNoteEditor, PartialBlock } from "@blocknote/core";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import { Check, Loader2, AlertCircle } from "lucide-react";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/shadcn/style.css";

type SaveStatus = "idle" | "unsaved" | "saving" | "saved" | "error";

interface EditorProps {
  /** Initial content as BlockNote block array (from Prisma Json field) */
  initialContent?: PartialBlock[] | null;
  /** Whether the editor is editable (admin = true, others = false) */
  editable?: boolean;
  /** Called to persist content to the database */
  onSave?: (content: Block[]) => Promise<void>;
  /** Debounce delay in ms before auto-saving (default: 1500) */
  debounceMs?: number;
}

const Editor: React.FC<EditorProps> = ({
  initialContent,
  editable = false,
  onSave,
  debounceMs = 1500,
}) => {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingContentRef = useRef<Block[] | null>(null);
  const isMountedRef = useRef(true);
  const onSaveRef = useRef(onSave);

  // Keep onSave ref current without triggering re-renders
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  const editor: BlockNoteEditor = useCreateBlockNote({
    initialContent:
      initialContent && initialContent.length > 0 ? initialContent : undefined,
  });

  // Perform save
  const doSave = useCallback(async (content: Block[]) => {
    if (!onSaveRef.current) return;
    setSaveStatus("saving");
    try {
      await onSaveRef.current(content);
      pendingContentRef.current = null;
      if (isMountedRef.current) setSaveStatus("saved");
    } catch (err) {
      console.error("Auto-save failed:", err);
      if (isMountedRef.current) setSaveStatus("error");
    }
  }, []);

  // Flush any pending save (used on unmount / node switch)
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      // Fire-and-forget flush on unmount
      if (pendingContentRef.current && onSaveRef.current) {
        onSaveRef.current(pendingContentRef.current);
      }
    };
  }, []);

  // Handle editor changes with debounced save
  const handleChange = useCallback(() => {
    if (!editable || !onSaveRef.current) return;

    const content = editor.document;
    pendingContentRef.current = content;
    setSaveStatus("unsaved");

    // Clear previous timer
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new debounce timer
    saveTimeoutRef.current = setTimeout(() => {
      doSave(content);
    }, debounceMs);
  }, [editor, editable, debounceMs, doSave]);

  // Fade out "saved" status after a short delay
  useEffect(() => {
    if (saveStatus === "saved") {
      const t = setTimeout(() => setSaveStatus("idle"), 2000);
      return () => clearTimeout(t);
    }
  }, [saveStatus]);

  // Check if content is truly empty:
  // - null/undefined, not an array, empty array
  // - array where ALL blocks are empty paragraphs (no text content in any block)
  const hasNoContent = (() => {
    if (
      !initialContent ||
      !Array.isArray(initialContent) ||
      initialContent.length === 0
    )
      return true;
    return initialContent.every((block) => {
      const content = block.content;
      // Block has no content array, or content is empty
      if (!content || (Array.isArray(content) && content.length === 0)) {
        // Also check children recursively
        const children = (block as any).children;
        if (!children || (Array.isArray(children) && children.length === 0))
          return true;
        return false;
      }
      // Content has items — check if all are empty text
      if (Array.isArray(content)) {
        return content.every(
          (item: any) =>
            item.type === "text" && (!item.text || item.text.trim() === ""),
        );
      }
      return false;
    });
  })();

  return (
    <div className="-mx-6 my-4">
      {editable && (
        <div className="flex justify-end px-14 mb-1 h-5 items-center">
          {saveStatus === "unsaved" && (
            <span className="flex items-center gap-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce [animation-delay:300ms]" />
            </span>
          )}
          {saveStatus === "saving" && (
            <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
          )}
          {saveStatus === "saved" && (
            <Check className="w-4 h-4 text-green-500" />
          )}
          {saveStatus === "error" && (
            <span className="flex items-center gap-1 text-xs text-red-500">
              <AlertCircle className="w-4 h-4" />
              Lỗi lưu — vui lòng tải lại trang
            </span>
          )}
        </div>
      )}
      {!editable && hasNoContent ? (
        <p className="px-6 text-gray-400 text-sm italic">
          No content available
        </p>
      ) : (
        <BlockNoteView
          editor={editor}
          editable={editable && saveStatus !== "error"}
          theme="light"
          onChange={handleChange}
        />
      )}
    </div>
  );
};

export default Editor;
