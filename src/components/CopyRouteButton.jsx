import { useState } from "react";

async function copyText(text) {
  if (!text) throw new Error("empty text");
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  throw new Error("clipboard unavailable");
}

export default function CopyRouteButton({ text, children, className = "" }) {
  const [status, setStatus] = useState("");
  const [fallbackOpen, setFallbackOpen] = useState(false);

  async function handleCopy(event) {
    event.stopPropagation();
    try {
      await copyText(text);
      setStatus("已复制");
      setFallbackOpen(false);
      window.setTimeout(() => setStatus(""), 1800);
    } catch {
      setStatus("复制失败，请手动复制");
      setFallbackOpen(true);
    }
  }

  return (
    <div className="space-y-2">
      <button type="button" onClick={handleCopy} className={className}>
        {children}
      </button>
      {status && <p className="text-xs font-black text-leaf">{status}</p>}
      {fallbackOpen && (
        <textarea
          value={text}
          readOnly
          onClick={(event) => event.currentTarget.select()}
          className="h-36 w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-700 outline-none focus:border-leaf focus:ring-4 focus:ring-mint"
        />
      )}
    </div>
  );
}
