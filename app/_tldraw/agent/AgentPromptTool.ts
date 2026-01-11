import { BaseBoxShapeTool, type TLShape } from "@tldraw/editor";

export class AgentPromptTool extends BaseBoxShapeTool {
  static override id = "agent-prompt";
  static override initial = "idle";

  override shapeType = "agent-prompt";

  override onCreate(shape: TLShape | null): void {
    if (!shape) return;

    if (this.editor.getInstanceState().isToolLocked) {
      this.editor.setCurrentTool("agent-prompt");
    } else {
      this.editor.setCurrentTool("select.idle");
    }
  }
}
