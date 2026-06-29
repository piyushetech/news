export function truncateForPreview(
  text: string,
  { maxLines = 4, charsPerLine = 40 }: { maxLines?: number; charsPerLine?: number } = {},
) {
  if (!text?.trim()) return { preview: '', truncated: false };
  const maxChars = Math.max(36, maxLines * charsPerLine - 12);
  if (text.length <= maxChars) return { preview: text, truncated: false };

  let cut = text.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(' ');
  if (lastSpace > cut.length * 0.55) cut = cut.slice(0, lastSpace);

  return { preview: `${cut.trim()}…`, truncated: true };
}

export function buildReadMoreText(
  fullText: string,
  expanded: boolean,
  options: { maxLines?: number; charsPerLine?: number } = {},
) {
  if (!fullText) return { text: '', showToggle: false, isLess: false };
  if (expanded) return { text: fullText, showToggle: true, isLess: true };

  const { preview, truncated } = truncateForPreview(fullText, options);
  return { text: preview, showToggle: truncated, isLess: false };
}
