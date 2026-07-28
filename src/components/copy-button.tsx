"use client";

import { useState } from "react";

export function CopyButton({
  text,
  label = "Copiar",
  className = "bg-white text-grape-deep",
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className={`shrink-0 cursor-pointer rounded-xl px-4 py-2.5 text-sm font-semibold transition-transform active:scale-[0.97] ${className}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {}
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? "Copiado" : label}
    </button>
  );
}
