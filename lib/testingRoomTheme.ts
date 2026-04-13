export const TESTING_ROOM_THEME_STORAGE_KEY = "ronan-testing-room-theme";

type TestingRoomThemePresetDefinition = {
  label: string;
  cardTitle: string;
  description: string;
  accentClass: string;
  shell: {
    rootClass: string;
    mainClass: string;
  };
  header: {
    shellClass: string;
    titleClass: string;
    timerShellClass: string;
    timerTextClass: string;
    timerWarningTextClass: string;
    timerHiddenTextClass: string;
    iconButtonClass: string;
    submitPrimaryClass: string;
    submitDangerClass: string;
    leaveButtonClass: string;
  };
  footer: {
    modalClass: string;
    modalHeaderClass: string;
    modalTitleClass: string;
    modalCloseButtonClass: string;
    modalLegendClass: string;
    unansweredLegendClass: string;
    gridAnsweredClass: string;
    gridUnansweredClass: string;
    currentPinClass: string;
    modalActionButtonClass: string;
    barClass: string;
    displayNameClass: string;
    navigatorButtonClass: string;
    secondaryNavButtonClass: string;
    primaryNavButtonClass: string;
  };
  viewer: {
    rootClass: string;
    leftPanelClass: string;
    imageCardClass: string;
    passageClass: string;
    dividerTrackClass: string;
    dividerHandleClass: string;
    questionNumberClass: string;
    questionToolbarClass: string;
    flagDefaultClass: string;
    flagActiveClass: string;
    flagIconActiveClass: string;
    eliminationIdleClass: string;
    eliminationActiveClass: string;
    sectionRuleClass: string;
    promptClass: string;
    sprInputClass: string;
    sprMetaClass: string;
    answerCrossedClass: string;
    answerSelectedClass: string;
    answerIdleClass: string;
    optionBadgeCrossedClass: string;
    optionBadgeSelectedClass: string;
    optionBadgeIdleClass: string;
    choiceTextClass: string;
    choiceCrossedTextClass: string;
  };
  desmos: {
    modalClass: string;
    headerClass: string;
    badgeClass: string;
    titleClass: string;
    controlButtonClass: string;
    bodyClass: string;
  };
  preview: {
    canvasClass: string;
    frameClass: string;
    topBarClass: string;
    topBarAccentClass: string;
    topBarControlClass: string;
    leftPaneClass: string;
    leftPaneCardClass: string;
    rightMetaClass: string;
    rightAnswerSelectedClass: string;
    rightAnswerIdleClass: string;
  };
};

export const TESTING_ROOM_THEME_PRESETS = {
  ronan: {
    label: "RONAN SAT",
    cardTitle: "Workbook testing room",
    description: "Keep the tactile workbook exam room with bold borders and highlighter accents.",
    accentClass: "bg-primary text-ink-fg",
    shell: {
      rootClass: "bg-paper-bg selection:bg-primary/70",
      mainClass: "bg-dot-pattern bg-paper-bg",
    },
    header: {
      shellClass: "border-b-4 border-ink-fg bg-surface-white",
      titleClass: "font-display font-black uppercase text-ink-fg",
      timerShellClass: "rounded-2xl border-2 border-ink-fg bg-paper-bg brutal-shadow-sm",
      timerTextClass: "text-ink-fg",
      timerWarningTextClass: "animate-pulse text-accent-3",
      timerHiddenTextClass: "text-ink-fg/40",
      iconButtonClass: "border-2 border-ink-fg bg-surface-white text-ink-fg workbook-press",
      submitPrimaryClass: "!rounded-2xl !border-2 !border-ink-fg !bg-primary !text-ink-fg",
      submitDangerClass: "!rounded-2xl !border-2 !border-ink-fg !bg-accent-3 !text-white",
      leaveButtonClass: "border-2 border-ink-fg bg-surface-white workbook-press",
    },
    footer: {
      modalClass: "workbook-modal-card",
      modalHeaderClass: "border-b-2 border-ink-fg",
      modalTitleClass: "font-display font-black uppercase text-ink-fg",
      modalCloseButtonClass: "border-2 border-ink-fg bg-surface-white text-ink-fg workbook-press",
      modalLegendClass: "border-b-2 border-ink-fg text-ink-fg",
      unansweredLegendClass: "border-2 border-dashed border-ink-fg",
      gridAnsweredClass: "border-2 border-ink-fg bg-accent-2 text-white",
      gridUnansweredClass: "border-2 border-dashed border-ink-fg bg-surface-white text-ink-fg",
      currentPinClass: "text-ink-fg",
      modalActionButtonClass: "workbook-button workbook-button-secondary px-6 py-2 text-sm",
      barClass: "border-t-4 border-ink-fg bg-surface-white",
      displayNameClass: "text-ink-fg",
      navigatorButtonClass: "workbook-button workbook-button-ink flex items-center px-4 py-2 text-sm",
      secondaryNavButtonClass: "workbook-button workbook-button-secondary px-6 py-1.5 text-sm",
      primaryNavButtonClass: "workbook-button px-6 py-1.5 text-sm",
    },
    viewer: {
      rootClass: "bg-surface-white",
      leftPanelClass: "border-r-4 border-ink-fg bg-surface-white",
      imageCardClass: "rounded-2xl border-2 border-ink-fg brutal-shadow-sm",
      passageClass: "rounded-2xl border-2 border-ink-fg text-ink-fg selection:bg-primary",
      dividerTrackClass: "bg-ink-fg/15 hover:bg-ink-fg/25",
      dividerHandleClass: "bg-ink-fg",
      questionNumberClass: "border-2 border-ink-fg bg-primary text-ink-fg",
      questionToolbarClass: "border-y-2 border-r-2 border-ink-fg bg-paper-bg",
      flagDefaultClass: "text-ink-fg",
      flagActiveClass: "text-accent-3 underline underline-offset-2",
      flagIconActiveClass: "fill-current text-accent-3",
      eliminationIdleClass: "border-2 border-ink-fg bg-surface-white text-ink-fg",
      eliminationActiveClass: "border-2 border-ink-fg bg-accent-2 text-white",
      sectionRuleClass: "h-[2px] bg-ink-fg",
      promptClass: "rounded-2xl border-2 border-ink-fg text-ink-fg",
      sprInputClass: "workbook-input max-w-sm [font-family:Georgia,'Times_New_Roman',Times,serif]",
      sprMetaClass: "text-ink-fg/70",
      answerCrossedClass: "cursor-default rounded-2xl border-2 border-ink-fg bg-paper-bg brutal-shadow-sm",
      answerSelectedClass: "rounded-2xl border-2 border-ink-fg bg-primary brutal-shadow-sm",
      answerIdleClass: "rounded-2xl border-2 border-ink-fg bg-surface-white brutal-shadow-sm",
      optionBadgeCrossedClass: "border-2 border-ink-fg bg-surface-white text-ink-fg/50",
      optionBadgeSelectedClass: "border-2 border-ink-fg bg-accent-2 text-white",
      optionBadgeIdleClass: "border-2 border-ink-fg bg-paper-bg text-ink-fg",
      choiceTextClass: "text-ink-fg",
      choiceCrossedTextClass: "text-ink-fg/50",
    },
    desmos: {
      modalClass: "border-2 border-ink-fg bg-surface-white brutal-shadow",
      headerClass: "border-b-4 border-ink-fg bg-accent-2 text-white",
      badgeClass: "workbook-sticker border-white/90 bg-white/90 text-accent-2",
      titleClass: "font-display font-black uppercase text-white",
      controlButtonClass: "border-2 border-ink-fg bg-surface-white text-ink-fg workbook-press",
      bodyClass: "bg-white",
    },
    preview: {
      canvasClass: "bg-paper-bg",
      frameClass: "border-2 border-ink-fg bg-[#f8f4ea] brutal-shadow-sm",
      topBarClass: "border-b-2 border-ink-fg bg-[#f3ecdd]",
      topBarAccentClass: "border-2 border-ink-fg bg-primary",
      topBarControlClass: "border-2 border-ink-fg bg-surface-white",
      leftPaneClass: "border-r-2 border-ink-fg bg-[radial-gradient(rgba(15,14,14,0.14)_1px,transparent_1px)] bg-[size:10px_10px]",
      leftPaneCardClass: "border-2 border-ink-fg bg-white",
      rightMetaClass: "bg-ink-fg/80",
      rightAnswerSelectedClass: "rounded-lg border-2 border-ink-fg bg-primary",
      rightAnswerIdleClass: "rounded-lg border-2 border-ink-fg bg-surface-white",
    },
  },
  collegeboard: {
    label: "College Board",
    cardTitle: "Bluebook-style testing room",
    description: "Use a cleaner Bluebook-style room with thinner dividers, cooler neutrals, and calmer controls.",
    accentClass: "bg-accent-2 text-white",
    shell: {
      rootClass: "bg-white text-[#202124] selection:bg-[#d7e8ff]",
      mainClass: "bg-white",
    },
    header: {
      shellClass: "border-b border-[#c7c7c7] bg-white text-[#202124]",
      titleClass: "font-semibold text-[#202124]",
      timerShellClass: "rounded-[20px] border border-[#bdbdbd] bg-white",
      timerTextClass: "text-[#202124]",
      timerWarningTextClass: "animate-pulse text-[#b3261e]",
      timerHiddenTextClass: "text-[#5f6368]",
      iconButtonClass: "border border-[#bdbdbd] bg-white text-[#202124] transition-colors hover:bg-[#f4f6f8]",
      submitPrimaryClass: "!rounded-full !border !border-[#1a73e8] !bg-[#1a73e8] !text-white",
      submitDangerClass: "!rounded-full !border !border-[#b3261e] !bg-[#d93025] !text-white",
      leaveButtonClass: "border border-[#bdbdbd] bg-white text-[#202124] transition-colors hover:bg-[#f4f6f8]",
    },
    footer: {
      modalClass: "rounded-[26px] border border-[#c7c7c7] bg-white shadow-[0_14px_40px_rgba(0,0,0,0.12)]",
      modalHeaderClass: "border-b border-[#d0d0d0]",
      modalTitleClass: "font-semibold text-[#202124]",
      modalCloseButtonClass: "border border-[#bdbdbd] bg-white text-[#202124] transition-colors hover:bg-[#f4f6f8]",
      modalLegendClass: "border-b border-[#d0d0d0] text-[#3c4043]",
      unansweredLegendClass: "border border-dashed border-[#9aa0a6]",
      gridAnsweredClass: "rounded-md border border-[#1a73e8] bg-[#1a73e8] text-white",
      gridUnansweredClass: "rounded-md border border-dashed border-[#9aa0a6] bg-surface-white text-[#202124]",
      currentPinClass: "text-[#202124]",
      modalActionButtonClass: "inline-flex items-center justify-center rounded-full border border-[#bdbdbd] bg-white px-6 py-2 text-sm font-semibold text-[#202124] transition-colors hover:bg-[#f4f6f8]",
      barClass: "border-t border-[#c7c7c7] bg-white",
      displayNameClass: "text-[#202124]",
      navigatorButtonClass: "flex items-center rounded-full bg-[#1f1f1f] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#353535]",
      secondaryNavButtonClass: "rounded-full border border-[#bdbdbd] bg-white px-6 py-1.5 text-sm font-semibold text-[#202124] transition-colors hover:bg-[#f4f6f8]",
      primaryNavButtonClass: "rounded-full border border-[#1a73e8] bg-[#1a73e8] px-6 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#1765cc]",
    },
    viewer: {
      rootClass: "bg-white",
      leftPanelClass: "border-r border-[#cfd3d7] bg-white",
      imageCardClass: "rounded-2xl border border-[#d2d6da] bg-white",
      passageClass: "rounded-[16px] bg-white text-[#202124] selection:bg-[#d7e8ff]",
      dividerTrackClass: "bg-[#d9dde1] hover:bg-[#c8cdd2]",
      dividerHandleClass: "bg-[#5f6368]",
      questionNumberClass: "border border-[#3c4043] bg-[#2d2d2d] text-white",
      questionToolbarClass: "border-y border-r border-[#cfd3d7] bg-white",
      flagDefaultClass: "text-[#202124]",
      flagActiveClass: "text-[#1a73e8] underline underline-offset-2",
      flagIconActiveClass: "fill-current text-[#1a73e8]",
      eliminationIdleClass: "border border-[#b8bec5] bg-white text-[#202124]",
      eliminationActiveClass: "border border-[#1a73e8] bg-[#1a73e8] text-white",
      sectionRuleClass: "h-px bg-[#cfd3d7]",
      promptClass: "rounded-[16px] bg-white text-[#202124]",
      sprInputClass: "w-full max-w-sm rounded-[14px] border border-[#c7cdd3] bg-white px-4 py-3 text-[#202124] outline-none [font-family:Georgia,'Times_New_Roman',Times,serif] focus:border-[#8ab4f8]",
      sprMetaClass: "text-[#5f6368]",
      answerCrossedClass: "cursor-default rounded-[14px] border border-[#d0d4d9] bg-[#f8f9fa]",
      answerSelectedClass: "rounded-[14px] border border-[#8ab4f8] bg-[#e8f0fe]",
      answerIdleClass: "rounded-[14px] border border-[#c7cdd3] bg-white hover:border-[#9aa0a6]",
      optionBadgeCrossedClass: "border border-[#c7cdd3] bg-white text-[#5f6368]",
      optionBadgeSelectedClass: "border border-[#1a73e8] bg-[#1a73e8] text-white",
      optionBadgeIdleClass: "border border-[#9aa0a6] bg-white text-[#202124]",
      choiceTextClass: "text-[#202124]",
      choiceCrossedTextClass: "text-[#5f6368]",
    },
    desmos: {
      modalClass: "border border-[#c7c7c7] bg-white shadow-[0_18px_48px_rgba(0,0,0,0.18)]",
      headerClass: "border-b border-[#d0d4d9] bg-[#f8f9fa] text-[#202124]",
      badgeClass: "inline-flex items-center rounded-full border border-[#c7c7c7] bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#1a73e8]",
      titleClass: "font-semibold text-[#202124]",
      controlButtonClass: "border border-[#b8bec5] bg-white text-[#202124] transition-colors hover:bg-[#eef2f5]",
      bodyClass: "bg-white",
    },
    preview: {
      canvasClass: "bg-[#f3f4f6]",
      frameClass: "border border-[#cfd3d7] bg-white shadow-[0_6px_14px_rgba(0,0,0,0.08)]",
      topBarClass: "border-b border-[#d7dbe0] bg-white",
      topBarAccentClass: "bg-[#2d2d2d]",
      topBarControlClass: "border border-[#c7c7c7] bg-white",
      leftPaneClass: "border-r border-[#d7dbe0] bg-white",
      leftPaneCardClass: "border border-[#d7dbe0] bg-white",
      rightMetaClass: "bg-[#444746]",
      rightAnswerSelectedClass: "rounded-xl border border-[#8ab4f8] bg-[#e8f0fe]",
      rightAnswerIdleClass: "rounded-xl border border-[#cfd3d7] bg-white",
    },
  },
} as const satisfies Record<string, TestingRoomThemePresetDefinition>;

export type TestingRoomTheme = keyof typeof TESTING_ROOM_THEME_PRESETS;
export type TestingRoomThemePreset = (typeof TESTING_ROOM_THEME_PRESETS)[TestingRoomTheme];

export const TESTING_ROOM_THEMES = Object.keys(TESTING_ROOM_THEME_PRESETS) as TestingRoomTheme[];
export const DEFAULT_TESTING_ROOM_THEME: TestingRoomTheme = "ronan";

export function isTestingRoomTheme(value: string | null | undefined): value is TestingRoomTheme {
  return typeof value === "string" && value in TESTING_ROOM_THEME_PRESETS;
}

export function getTestingRoomThemePreset(theme: TestingRoomTheme): TestingRoomThemePreset {
  return TESTING_ROOM_THEME_PRESETS[theme];
}

export function listTestingRoomThemePresets() {
  return TESTING_ROOM_THEMES.map((theme) => ({
    theme,
    preset: TESTING_ROOM_THEME_PRESETS[theme],
  }));
}

export function readStoredTestingRoomTheme(): TestingRoomTheme {
  if (typeof window === "undefined") {
    return DEFAULT_TESTING_ROOM_THEME;
  }

  const storedTheme = window.localStorage.getItem(TESTING_ROOM_THEME_STORAGE_KEY);
  return isTestingRoomTheme(storedTheme) ? storedTheme : DEFAULT_TESTING_ROOM_THEME;
}

export function persistTestingRoomTheme(theme: TestingRoomTheme) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(TESTING_ROOM_THEME_STORAGE_KEY, theme);
}
