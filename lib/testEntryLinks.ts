import { normalizeSectionName } from "@/lib/sections";

export type TestRoomMode = "full" | "sectional";

type TestRoomLinkOptions = {
  mode?: TestRoomMode;
  sectionName?: string;
  module?: number | null;
};

function buildQueryString({ mode = "full", sectionName, module }: TestRoomLinkOptions) {
  const params = new URLSearchParams({ mode });

  if (mode === "sectional") {
    const normalizedSection = normalizeSectionName(sectionName);

    if (normalizedSection) {
      params.set("section", normalizedSection);
    }

    if (typeof module === "number" && Number.isInteger(module) && module > 0) {
      params.set("module", String(module));
    }
  }

  return params.toString();
}

export function buildTestingRoomHref(testId: string, options: TestRoomLinkOptions = {}) {
  const queryString = buildQueryString(options);
  return `/test/${encodeURIComponent(testId)}${queryString ? `?${queryString}` : ""}`;
}

export function buildTestEntryHref(testId: string, options: TestRoomLinkOptions = {}) {
  const queryString = buildQueryString(options);
  return `/test/${encodeURIComponent(testId)}/entry${queryString ? `?${queryString}` : ""}`;
}
