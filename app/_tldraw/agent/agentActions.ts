import type { Editor, TLArrowBinding, TLShapeId } from "tldraw";
import { createShapeId, toRichText } from "tldraw";
import { MAX_SHAPES_FOR_AGENT } from "@/app/_constants/agent";

type AgentArrowBinding = {
  terminal: TLArrowBinding["props"]["terminal"];
  /** The id of the shape this arrow terminal is bound to. */
  toId: string;
  /** In [0..1] x [0..1], relative to the bound shape's page bounds. */
  normalizedAnchor?: { x: number; y: number };
  isExact?: boolean;
  isPrecise?: boolean;
};

export type AgentResponse = {
  actions: AgentAction[];
  notes: string;
};

export type AgentAction =
  | {
      _type: "create_shape";
      shape:
        | {
            kind: "geo";
            /** Optional stable id (lets later actions reference this shape). */
            id?: string;
            geo:
              | "rectangle"
              | "ellipse"
              | "triangle"
              | "diamond"
              | "cloud"
              | "hexagon"
              | "star";
            x: number;
            y: number;
            w?: number;
            h?: number;
            label?: string;
            color?: string;
          }
        | {
            kind: "text";
            /** Optional stable id (lets later actions reference this shape). */
            id?: string;
            x: number;
            y: number;
            w?: number;
            text: string;
            color?: string;
          }
        | {
            kind: "arrow";
            /** Optional stable id (lets later actions reference this shape). */
            id?: string;
            start: { x: number; y: number };
            end: { x: number; y: number };
            color?: string;
            label?: string;
            /**
             * Optional tldraw-style bindings for arrow terminals.
             * Each binding corresponds to a TLArrowBinding record (type: "arrow").
             */
            bindings?: AgentArrowBinding[];
          };
    }
  | {
      _type: "update_shape";
      id: string;
      patch: { x?: number; y?: number; props?: object };
    }
  | { _type: "delete_shape"; id: string }
  | { _type: "select"; ids: string[] };

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function getCanvasStateForAgent(
  editor: Editor,
  opts?: { excludeTypes?: string[] },
) {
  const exclude = new Set(opts?.excludeTypes ?? []);
  const shapes = editor
    .getCurrentPageShapes()
    .filter((s) => !exclude.has(s.type));

  return shapes.slice(0, MAX_SHAPES_FOR_AGENT).map((shape) => {
    const base = {
      id: shape.id,
      type: shape.type,
      x: shape.x,
      y: shape.y,
      props: isObject(shape.props) ? shape.props : {},
    };

    if (shape.type !== "arrow") return base;

    // Include arrow bindings so the agent can describe / edit connections using tldraw's model.
    const bindings = editor
      .getBindingsFromShape<TLArrowBinding>(shape.id, "arrow")
      .map(
        (b) =>
          ({
            terminal: b.props.terminal,
            toId: b.toId,
            normalizedAnchor: b.props.normalizedAnchor,
            isExact: b.props.isExact,
            isPrecise: b.props.isPrecise,
          }) satisfies AgentArrowBinding,
      );

    return {
      ...base,
      bindings,
    };
  });
}

function toShapeId(id: string): TLShapeId {
  return id as TLShapeId;
}

function ensureShapeId(id: string): TLShapeId {
  if (id.startsWith("shape:")) return id as TLShapeId;
  return createShapeId(id);
}

function clamp(n: number) {
  return Math.min(1, Math.max(0, n));
}

function getNormalizedAnchorFromPoint(
  editor: Editor,
  targetId: TLShapeId,
  pagePoint: { x: number; y: number },
): { x: number; y: number } {
  const bounds = editor.getShapePageBounds(targetId);
  if (!bounds || bounds.w === 0 || bounds.h === 0) return { x: 0.5, y: 0.5 };
  return {
    x: clamp((pagePoint.x - bounds.x) / bounds.w),
    y: clamp((pagePoint.y - bounds.y) / bounds.h),
  };
}

export function applyAgentActions(editor: Editor, actions: AgentAction[]) {
  editor.run(() => {
    for (const action of actions) {
      if (action._type === "create_shape") {
        if (action.shape.kind === "geo") {
          const id = action.shape.id
            ? ensureShapeId(action.shape.id)
            : createShapeId();
          editor.createShape({
            id,
            type: "geo",
            x: action.shape.x,
            y: action.shape.y,
            props: {
              geo: action.shape.geo,
              w: action.shape.w ?? 220,
              h: action.shape.h ?? 140,
              color: action.shape.color ?? "black",
              fill: "none",
              dash: "draw",
              size: "m",
              font: "draw",
              align: "middle",
              verticalAlign: "middle",
              richText: toRichText(action.shape.label ?? ""),
              labelColor: action.shape.color ?? "black",
            },
          });
          continue;
        }

        if (action.shape.kind === "text") {
          const id = action.shape.id
            ? ensureShapeId(action.shape.id)
            : createShapeId();
          editor.createShape({
            id,
            type: "text",
            x: action.shape.x,
            y: action.shape.y,
            props: {
              w: action.shape.w ?? 320,
              autoSize: true,
              color: action.shape.color ?? "black",
              font: "draw",
              size: "m",
              scale: 1,
              textAlign: "start",
              richText: toRichText(action.shape.text),
            },
          });
          continue;
        }

        if (action.shape.kind === "arrow") {
          const id = action.shape.id
            ? ensureShapeId(action.shape.id)
            : createShapeId();

          const start = action.shape.start;
          const end = action.shape.end;

          editor.createShape({
            id,
            type: "arrow",
            x: start.x,
            y: start.y,
            props: {
              start: {
                x: 0,
                y: 0,
              },
              end: {
                x: end.x - start.x,
                y: end.y - start.y,
              },
              arrowheadStart: "none",
              arrowheadEnd: "arrow",
              color: action.shape.color ?? "black",
              dash: "draw",
              size: "m",
              font: "draw",
              labelColor: action.shape.color ?? "black",
              richText: toRichText(action.shape.label ?? ""),
            },
          });

          // Apply tldraw arrow bindings (terminal -> shape) if provided.
          const bindings = action.shape.bindings ?? [];
          for (const binding of bindings) {
            const targetId = ensureShapeId(binding.toId);
            const target = editor.getShape(targetId);
            if (!target) continue;
            if (target.type === "agent-prompt") continue;

            const normalizedAnchor =
              binding.normalizedAnchor ??
              getNormalizedAnchorFromPoint(
                editor,
                targetId,
                binding.terminal === "start" ? start : end,
              );

            editor.createBinding<TLArrowBinding>({
              type: "arrow",
              fromId: id,
              toId: targetId,
              props: {
                terminal: binding.terminal,
                normalizedAnchor,
                isExact: binding.isExact ?? false,
                isPrecise: binding.isPrecise ?? true,
              },
            });
          }

          continue;
        }
      }

      if (action._type === "update_shape") {
        const shapeId = toShapeId(action.id);
        const existing = editor.getShape(shapeId);
        if (!existing) continue;
        editor.updateShape({
          id: existing.id,
          type: existing.type,
          ...(typeof action.patch.x === "number"
            ? { x: action.patch.x }
            : null),
          ...(typeof action.patch.y === "number"
            ? { y: action.patch.y }
            : null),
          ...(action.patch.props && typeof action.patch.props === "object"
            ? { props: action.patch.props as Record<string, unknown> }
            : null),
        });
        continue;
      }

      if (action._type === "delete_shape") {
        const shapeId = toShapeId(action.id);
        const existing = editor.getShape(shapeId);
        if (!existing) continue;
        editor.deleteShapes([existing.id]);
        continue;
      }

      if (action._type === "select") {
        const ids = action.ids
          .map(toShapeId)
          .filter((id: TLShapeId) => editor.getShape(id));
        if (ids.length === 0) {
          editor.selectNone();
        } else {
          editor.setSelectedShapes(ids);
        }
      }
    }
  });
}
