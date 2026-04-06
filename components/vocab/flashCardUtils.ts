export function parseFlashCardText(text: string) {
  const normalized = text.trim();
  const separatorMatch = normalized.match(/\s*[:\uFF1A]\s*/);

  if (!separatorMatch || separatorMatch.index === undefined) {
    return {
      vocabulary: normalized,
      meaning: "",
    };
  }

  const separatorStart = separatorMatch.index;
  const separatorEnd = separatorStart + separatorMatch[0].length;

  return {
    vocabulary: normalized.slice(0, separatorStart).trim() || normalized,
    meaning: normalized.slice(separatorEnd).trim(),
  };
}
