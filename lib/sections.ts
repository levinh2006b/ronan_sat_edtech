export const VERBAL_SECTION = "Verbal";
export const LEGACY_VERBAL_SECTION = "Reading and Writing";
export const MATH_SECTION = "Math";

export function normalizeSectionName(section: string | null | undefined): string {
  const trimmed = section?.trim();

  if (!trimmed) {
    return "";
  }

  const normalized = trimmed.toLowerCase();

  if (
    normalized === "verbal" ||
    normalized === "reading" ||
    normalized === "reading and writing" ||
    normalized === "reading & writing" ||
    normalized === "reading-and-writing"
  ) {
    return VERBAL_SECTION;
  }

  if (normalized === "math") {
    return MATH_SECTION;
  }

  return trimmed;
}

export function isVerbalSection(section: string | null | undefined): boolean {
  return normalizeSectionName(section) === VERBAL_SECTION;
}

export function getSectionQueryNames(section: string | null | undefined): string[] {
  const normalized = normalizeSectionName(section);

  if (normalized === VERBAL_SECTION) {
    return [VERBAL_SECTION, LEGACY_VERBAL_SECTION];
  }

  if (!normalized) {
    return [];
  }

  return [normalized];
}
