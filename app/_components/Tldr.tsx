"use client";

import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";
import { AgentPromptShapeUtil } from "../_tldraw/agent/AgentPromptShapeUtil";
import { AgentPromptTool } from "../_tldraw/agent/AgentPromptTool";
import { tldrawComponents, tldrawOverrides } from "./tldrawUi";

const tools = [AgentPromptTool] as const;
const shapeUtils = [AgentPromptShapeUtil] as const;

export function Tldr() {
  return (
    <div className="fixed inset-0 [&_.tl-watermark\_SEE-LICENSE]:hidden!">
      <Tldraw
        tools={tools}
        shapeUtils={shapeUtils}
        overrides={tldrawOverrides}
        components={tldrawComponents}
      />
    </div>
  );
}
