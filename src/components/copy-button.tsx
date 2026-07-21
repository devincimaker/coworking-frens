"use client";

import { useState } from "react";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="shrink-0 cursor-pointer rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-grape-deep transition-transform active:scale-[0.97]"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {}
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? "Copiado" : "Copiar"}
    </button>
  );
}
