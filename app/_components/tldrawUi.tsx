"use client";

import {
  DefaultToolbar,
  DefaultToolbarContent,
  type TLComponents,
  type TLUiIconJsx,
  type TLUiOverrides,
  ToolbarItem,
} from "tldraw";

const agentToolIcon: TLUiIconJsx = (
  <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round">
    <title>Agent Tool</title>
    <path d="M8.5 18.5h7" stroke="currentColor" strokeWidth="1.8" />
    <path d="M12 2.8v2.4" stroke="currentColor" strokeWidth="1.8" />
    <path d="M7.2 7.2 5.7 5.7" stroke="currentColor" strokeWidth="1.8" />
    <path d="M16.8 7.2l1.5-1.5" stroke="currentColor" strokeWidth="1.8" />
    <path
      d="M6.5 10.5a5.5 5.5 0 0 1 11 0v3.1c0 .7-.3 1.3-.8 1.8l-1.3 1.3c-.5.5-1.1.8-1.8.8h-3.2c-.7 0-1.3-.3-1.8-.8l-1.3-1.3c-.5-.5-.8-1.1-.8-1.8v-3.1Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path
      d="M9.6 12.2h.01M14.4 12.2h.01"
      stroke="currentColor"
      strokeWidth="2.4"
    />
  </svg>
);

function CustomToolbar() {
  return (
    <DefaultToolbar>
      <ToolbarItem tool="agent-prompt" />
      <DefaultToolbarContent />
    </DefaultToolbar>
  );
}

export const tldrawComponents: TLComponents = {
  Toolbar: CustomToolbar,
};

export const tldrawOverrides: TLUiOverrides = {
  tools: (editor, tools) => {
    return {
      ...tools,
      "agent-prompt": {
        id: "agent-prompt",
        label: "Agent",
        kbd: "shift+a",
        icon: agentToolIcon,
        onSelect(_source) {
          editor.setCurrentTool("agent-prompt");
        },
      },
    };
  },
};
