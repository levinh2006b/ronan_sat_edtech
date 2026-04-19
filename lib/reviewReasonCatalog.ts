export type ReviewReasonItem = {
  id: string;
  label: string;
  color: string;
  order: number;
};

export const REVIEW_REASON_COLOR_PRESETS = [
  "#F7D6E0",
  "#F9C8A7",
  "#F6E27A",
  "#D8F19A",
  "#AEE9D1",
  "#9ADDF5",
  "#AFC5FF",
  "#C7B5FF",
  "#F2B8FF",
  "#F29AA3",
  "#F4A261",
  "#E9C46A",
  "#90BE6D",
  "#43AA8B",
  "#4D96FF",
  "#577590",
  "#6D597A",
  "#B56576",
  "#3A86FF",
  "#8338EC",
] as const;

const DEFAULT_REVIEW_REASONS: ReviewReasonItem[] = [
  { id: "careless", label: "Careless", color: "#F6E27A", order: 0 },
  { id: "concept-gap", label: "Concept gap", color: "#F7D6E0", order: 1 },
  { id: "timing", label: "Timing", color: "#9ADDF5", order: 2 },
];

function clampHex(value: string) {
  const normalized = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(normalized) ? normalized.toUpperCase() : undefined;
}

function slugifyReasonLabel(label: string) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function getDefaultReviewReasonCatalog() {
  return DEFAULT_REVIEW_REASONS.map((item) => ({ ...item }));
}

export function isDefaultReviewReasonCatalog(value: unknown) {
  const normalized = normalizeReviewReasonCatalog(value);
  const defaults = getDefaultReviewReasonCatalog();

  if (normalized.length !== defaults.length) {
    return false;
  }

  return normalized.every((item, index) => {
    const defaultItem = defaults[index];
    return item.id === defaultItem.id && item.label === defaultItem.label && item.color === defaultItem.color && item.order === defaultItem.order;
  });
}

export function normalizeReviewReasonCatalog(value: unknown): ReviewReasonItem[] {
  if (!Array.isArray(value)) {
    return getDefaultReviewReasonCatalog();
  }

  const normalized = value
    .map((item, index) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const raw = item as Partial<ReviewReasonItem>;
      const label = typeof raw.label === "string" ? raw.label.trim().slice(0, 40) : "";
      if (!label) {
        return null;
      }

      return {
        id: typeof raw.id === "string" && raw.id.trim() ? raw.id.trim().slice(0, 50) : `${slugifyReasonLabel(label)}-${index}`,
        label,
        color: clampHex(typeof raw.color === "string" ? raw.color : "") || REVIEW_REASON_COLOR_PRESETS[index % REVIEW_REASON_COLOR_PRESETS.length],
        order: typeof raw.order === "number" && Number.isFinite(raw.order) ? raw.order : index,
      } satisfies ReviewReasonItem;
    })
    .filter((item): item is ReviewReasonItem => Boolean(item))
    .sort((left, right) => left.order - right.order)
    .map((item, index) => ({ ...item, order: index }));

  return normalized.length > 0 ? normalized : getDefaultReviewReasonCatalog();
}

export function getReadableTextColor(backgroundColor: string) {
  const hex = clampHex(backgroundColor) || "#FFFFFF";
  const red = Number.parseInt(hex.slice(1, 3), 16);
  const green = Number.parseInt(hex.slice(3, 5), 16);
  const blue = Number.parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  return luminance > 0.62 ? "#1F1F1F" : "#FFFFFF";
}

export function createReviewReasonId(label: string) {
  return `${slugifyReasonLabel(label) || "reason"}-${Math.random().toString(36).slice(2, 8)}`;
}
