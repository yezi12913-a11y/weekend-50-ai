function fallbackCopyText(text, doc) {
  if (!doc?.body || typeof doc.createElement !== "function" || typeof doc.execCommand !== "function") return false;

  const textarea = doc.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "-9999px";
  textarea.style.opacity = "0";
  doc.body.appendChild(textarea);
  textarea.select();

  let copied = false;
  try {
    copied = doc.execCommand("copy");
  } finally {
    doc.body.removeChild(textarea);
  }
  return copied;
}

export async function copyTextToClipboard(text, env = globalThis) {
  const value = String(text || "");
  if (!value) return false;

  try {
    if (env.navigator?.clipboard?.writeText) {
      await env.navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fall through to the DOM-based fallback below.
  }

  try {
    return fallbackCopyText(value, env.document);
  } catch {
    return false;
  }
}
