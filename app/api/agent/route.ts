import { $ } from "bun";
import { NextResponse } from "next/server";
import { MAX_SHAPES_FOR_AGENT } from "@/app/_constants/agent";
import type { AgentAction } from "@/app/_tldraw/agent/agentActions";

type CanvasShapeSummary = {
  id: string;
  type: string;
  x?: number;
  y?: number;
  props?: Record<string, unknown>;
};

type AgentRequestBody = {
  message: string;
  shapes?: CanvasShapeSummary[];
  extraInstructions?: string;
};

type AgentPlan = {
  actions: AgentAction[];
  notes: string;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function buildPrompt(body: AgentRequestBody): string {
  const shapes = body.shapes ?? [];
  const shapesText = shapes.length
    ? JSON.stringify(shapes.slice(0, 200), null, 2)
    : "[]";

  return `You are an assistant that plans edits to a tldraw canvas.

Return ONLY valid JSON (no markdown, no commentary).

Schema (strict):
{
  "actions": [
    {"_type":"create_shape","shape":{"kind":"geo","id"?:string,"geo":"rectangle"|"ellipse"|"triangle"|"diamond"|"cloud"|"hexagon"|"star","x":number,"y":number,"w"?:number,"h"?:number,"label"?:string,"color"?:string}},
    {"_type":"create_shape","shape":{"kind":"text","id"?:string,"x":number,"y":number,"w"?:number,"text":string,"color"?:string}},
    {"_type":"create_shape","shape":{"kind":"arrow","id"?:string,"start":{"x":number,"y":number},"end":{"x":number,"y":number},"color"?:string,"label"?:string,
      "bindings"?: [{"terminal":"start"|"end","toId":string,"normalizedAnchor"?:{"x":number,"y":number},"isExact"?:boolean,"isPrecise"?:boolean}] }},
    {"_type":"update_shape","id":string,"patch":{"x"?:number,"y"?:number,"props"?:object}},
    {"_type":"delete_shape","id":string},
    {"_type":"select","ids":string[]}
  ],
  "notes": string
}

Rules:
- Use existing shape ids from CANVAS_STATE when updating/deleting/selecting.
- If you create multiple shapes that reference each other (e.g. arrows bound to boxes), provide stable ids via shape.id so bindings can refer to them.
- Prefer small numbers of actions.
- If the request is ambiguous, return an empty actions array and explain in notes.

USER_INSTRUCTIONS:
${body.message}

CANVAS_STATE (array of shapes):
${shapesText}

${body.extraInstructions ? `EXTRA_INSTRUCTIONS:\n${body.extraInstructions}\n` : ""}`;
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    // fall through
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    const slice = trimmed.slice(start, end + 1);
    return JSON.parse(slice);
  }

  throw new Error("Could not parse JSON from output");
}

function validatePlan(plan: unknown): AgentPlan {
  if (!isObject(plan)) throw new Error("Plan is not an object");
  if (!Array.isArray(plan.actions))
    throw new Error("Plan.actions must be an array");
  if (typeof plan.notes !== "string")
    throw new Error("Plan.notes must be a string");

  // light validation of action structure
  for (const action of plan.actions) {
    if (!isObject(action) || typeof action._type !== "string") {
      throw new Error("Invalid action in actions array");
    }
    switch (action._type) {
      case "create_shape": {
        if (!isObject(action.shape) || typeof action.shape.kind !== "string") {
          throw new Error("create_shape.shape is invalid");
        }

        // Optional additional validation for arrow bindings.
        if (action.shape.kind === "arrow") {
          if ("bindings" in action.shape && action.shape.bindings != null) {
            if (!Array.isArray(action.shape.bindings)) {
              throw new Error("create_shape.shape.bindings must be an array");
            }
            for (const b of action.shape.bindings) {
              if (!isObject(b)) {
                throw new Error(
                  "Invalid binding in create_shape.shape.bindings",
                );
              }
              if (b.terminal !== "start" && b.terminal !== "end") {
                throw new Error("binding.terminal must be 'start' or 'end'");
              }
              if (typeof b.toId !== "string") {
                throw new Error("binding.toId must be a string");
              }
            }
          }
        }
        break;
      }
      case "update_shape": {
        if (typeof action.id !== "string" || !isObject(action.patch)) {
          throw new Error("update_shape is invalid");
        }
        break;
      }
      case "delete_shape": {
        if (typeof action.id !== "string")
          throw new Error("delete_shape is invalid");
        break;
      }
      case "select": {
        if (
          !Array.isArray(action.ids) ||
          !action.ids.every((v) => typeof v === "string")
        ) {
          throw new Error("select.ids is invalid");
        }
        break;
      }
      default:
        throw new Error(`Unknown action type: ${action._type}`);
    }
  }

  return plan as AgentPlan;
}

export async function POST(req: Request) {
  let body: AgentRequestBody;
  try {
    body = (await req.json()) as AgentRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    !body ||
    typeof body.message !== "string" ||
    body.message.trim().length === 0
  ) {
    return NextResponse.json(
      { error: "Missing required field: message (string)" },
      { status: 400 },
    );
  }

  if (body.message.length > 20_000) {
    return NextResponse.json({ error: "message too long" }, { status: 413 });
  }

  const prompt = buildPrompt({
    message: body.message,
    shapes: Array.isArray(body.shapes)
      ? body.shapes.slice(0, MAX_SHAPES_FOR_AGENT)
      : [],
    extraInstructions: body.extraInstructions,
  });

  try {
    const proc =
      await $`cursor-agent -p --output-format text ${prompt}`.nothrow();

    const stdout = proc.stdout.toString();
    const stderr = proc.stderr.toString();
    const exitCode = proc.exitCode;

    if (exitCode !== 0) {
      return NextResponse.json(
        {
          error: "cursor-agent failed",
          exitCode,
          stderr,
        },
        { status: 502 },
      );
    }

    let plan: AgentPlan;
    try {
      plan = validatePlan(extractJsonObject(stdout));
    } catch (e) {
      return NextResponse.json(
        {
          error: "cursor-agent output was not valid plan JSON",
          detail: e instanceof Error ? e.message : String(e),
          agentStdout: stdout,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ actions: plan.actions, notes: plan.notes });
  } catch (e) {
    return NextResponse.json(
      {
        error: "Failed to run cursor-agent",
        detail: e instanceof Error ? e.message : String(e),
      },
      { status: 500 },
    );
  }
}
