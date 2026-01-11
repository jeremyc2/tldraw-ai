import type { Editor, TLShapeId } from "tldraw";
import { createShapeId, toRichText } from "tldraw";
import { MAX_SHAPES_FOR_AGENT } from "@/app/_constants/agent";

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
            x: number;
            y: number;
            w?: number;
            text: string;
            color?: string;
          }
        | {
            kind: "arrow";
            start: { x: number; y: number };
            end: { x: number; y: number };
            color?: string;
            label?: string;
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

  return shapes.slice(0, MAX_SHAPES_FOR_AGENT).map((shape) => ({
    id: shape.id,
    type: shape.type,
    x: shape.x,
    y: shape.y,
    props: isObject(shape.props) ? shape.props : {},
  }));
}

function toShapeId(id: string): TLShapeId {
  return id as TLShapeId;
}

export function applyAgentActions(editor: Editor, actions: AgentAction[]) {
  editor.run(() => {
    for (const action of actions) {
      if (action._type === "create_shape") {
        if (action.shape.kind === "geo") {
          const id = createShapeId();
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
          const id = createShapeId();
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
          const id = createShapeId();
          editor.createShape({
            id,
            type: "arrow",
            x: action.shape.start.x,
            y: action.shape.start.y,
            props: {
              start: {
                x: 0,
                y: 0,
              },
              end: {
                x: action.shape.end.x - action.shape.start.x,
                y: action.shape.end.y - action.shape.start.y,
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
