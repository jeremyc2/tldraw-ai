import {
  BaseBoxShapeUtil,
  HTMLContainer,
  type RecordProps,
  type TLBaseBoxShape,
} from "@tldraw/editor";
import { T } from "@tldraw/validate";
import { useCallback, useEffect, useMemo, useState } from "react";
import { type Editor, useEditor } from "tldraw";
import { cn } from "@/app/_utils/cn";
import {
  type AgentResponse,
  applyAgentActions,
  getCanvasStateForAgent,
} from "./agentActions";

export type AgentPromptShape = TLBaseBoxShape & {
  type: "agent-prompt";
  props: {
    w: number;
    h: number;
    message: string;
  };
};

const agentPromptShapeProps = {
  w: T.number,
  h: T.number,
  message: T.string,
} satisfies RecordProps<AgentPromptShape>;

function stopEvent(e: {
  stopPropagation(): void;
  nativeEvent?: {
    stopImmediatePropagation?: () => void;
  };
}) {
  // Allow copy/cut/paste shortcuts to work
  if (
    e.nativeEvent instanceof KeyboardEvent &&
    (e.nativeEvent.metaKey || e.nativeEvent.ctrlKey) &&
    (e.nativeEvent.key === "c" ||
      e.nativeEvent.key === "x" ||
      e.nativeEvent.key === "v")
  ) {
    return;
  }

  e.stopPropagation();
  // Some tldraw listeners are global; stopping immediate propagation helps prevent
  // key events from becoming tool shortcuts while typing.
  e.nativeEvent?.stopImmediatePropagation?.();
}

async function runAgent(
  editor: Editor,
  opts: { message: string },
): Promise<AgentResponse> {
  const shapes = getCanvasStateForAgent(editor, {
    excludeTypes: ["agent-prompt"],
  });

  const res = await fetch("/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: opts.message,
      shapes,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }

  return (await res.json()) as AgentResponse;
}

export class AgentPromptShapeUtil extends BaseBoxShapeUtil<AgentPromptShape> {
  static override type = "agent-prompt" as const;
  static override props = agentPromptShapeProps;

  override getDefaultProps(): AgentPromptShape["props"] {
    return {
      w: 420,
      h: 260,
      message: "",
    };
  }

  override component(shape: AgentPromptShape) {
    const editor = useEditor();

    const [draftMessage, setDraftMessage] = useState(shape.props.message);
    const [isRunning, setIsRunning] = useState(false);
    const [notes, setNotes] = useState<string>("");
    const [error, setError] = useState<string>("");

    useEffect(() => {
      setDraftMessage(shape.props.message);
    }, [shape.props.message]);

    const canRun = useMemo(() => {
      return draftMessage.trim().length > 0 && !isRunning;
    }, [draftMessage, isRunning]);

    const updateProps = useCallback(
      (patch: Partial<AgentPromptShape["props"]>) => {
        editor.updateShape({
          id: shape.id,
          type: shape.type,
          props: { ...shape.props, ...patch },
        });
      },
      [editor, shape.id, shape.props, shape.type],
    );

    const run = useCallback(async () => {
      if (!canRun) return;

      const message = draftMessage.trim();
      updateProps({ message });

      setIsRunning(true);
      setNotes("");
      setError("");

      try {
        const data = await runAgent(editor, {
          message,
        });
        applyAgentActions(editor, data.actions ?? []);
        setNotes(data.notes ?? "");
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setIsRunning(false);
      }
    }, [canRun, draftMessage, editor, updateProps]);

    return (
      <HTMLContainer
        className="agentPrompt [pointer-events:all]! flex flex-col overflow-hidden rounded-xl border border-black/10 bg-white/90 shadow-xl backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/85"
        style={{
          width: shape.props.w,
          height: shape.props.h,
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji",
        }}
      >
        <div className="flex items-center justify-between gap-2 border-b border-black/10 bg-zinc-50/80 px-3 py-2 dark:border-white/10 dark:bg-zinc-800/70">
          <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
            Agent
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
          <textarea
            value={draftMessage}
            placeholder='e.g. "Draw a simple system diagram with 3 boxes and arrows"'
            onChange={(e) => setDraftMessage(e.target.value)}
            onBlur={() => updateProps({ message: draftMessage })}
            onPointerDown={stopEvent}
            onKeyDownCapture={stopEvent}
            onKeyUpCapture={stopEvent}
            onKeyDown={stopEvent}
            className="select-text min-h-0 w-full flex-1 resize-none rounded-lg border border-black/10 bg-white px-3 py-2 text-sm leading-snug text-zinc-900 outline-none placeholder:text-zinc-500/80 focus:border-zinc-400 focus:ring-2 focus:ring-black/10 dark:border-white/10 dark:bg-zinc-800/60 dark:text-zinc-100 dark:placeholder:text-zinc-400/80 dark:focus:border-zinc-400/60 dark:focus:ring-white/10"
          />

          <div className="flex justify-end">
            <button
              type="button"
              disabled={!canRun}
              onClick={run}
              onPointerDown={stopEvent}
              className={cn(
                "rounded-lg border px-4 py-2 text-sm font-semibold transition",
                canRun &&
                  "border-black/10 bg-zinc-900 text-white hover:bg-zinc-800 dark:border-white/10 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200",
                !canRun &&
                  "cursor-not-allowed border-black/10 bg-zinc-400/40 text-white/90 dark:border-white/10 dark:bg-white/10 dark:text-white/70",
              )}
            >
              {isRunning ? "Running…" : "Run"}
            </button>
          </div>

          {notes ? (
            <div
              onPointerDown={stopEvent}
              className="select-text! max-h-28 overflow-auto whitespace-pre-wrap rounded-lg border border-black/10 bg-white/70 p-3 text-xs text-zinc-800 dark:border-white/10 dark:bg-zinc-800/50 dark:text-zinc-200"
            >
              {notes}
            </div>
          ) : null}

          {error ? (
            <div
              onPointerDown={stopEvent}
              className="max-h-28 overflow-auto whitespace-pre-wrap rounded-lg border border-red-500/50 bg-red-50 p-3 text-xs text-red-700 dark:border-red-400/50 dark:bg-red-950/30 dark:text-red-200"
            >
              {error}
            </div>
          ) : null}
        </div>
      </HTMLContainer>
    );
  }

  override indicator(shape: AgentPromptShape) {
    return (
      <rect width={shape.props.w} height={shape.props.h} rx={12} ry={12} />
    );
  }
}
