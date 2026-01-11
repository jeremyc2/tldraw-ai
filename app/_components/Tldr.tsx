"use client";

import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";
import { TldrInner } from "./TldrInner";

export function Tldr() {
  return (
    <div className="fixed inset-0 [&_.tl-watermark\_SEE-LICENSE]:hidden!">
      <Tldraw>
        <TldrInner />
      </Tldraw>
    </div>
  );
}
