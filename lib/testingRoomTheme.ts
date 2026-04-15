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
    mobileMenuClass: string;
    mobileMenuSectionClass: string;
    mobileMenuLabelClass: string;
    mobileMenuSecondaryActionClass: string;
    mobileMenuActionShapeClass: string;
    submitPrimaryClass: string;
    submitDangerClass: string;
    leaveButtonClass: string;
    leaveButtonShapeClass: string;
    reportTriggerClass: string;
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
    readingFontClass: string;
    leftPanelClass: string;
    imageCardClass: string;
    passageClass: string;
    annotationToolbarClass: string;
    annotationAddButtonClass: string;
    annotationSwatchButtonClass: string;
    annotationSwatchActiveClass: string;
    annotationIconButtonClass: string;
    annotationIconButtonActiveClass: string;
    annotationDeleteButtonClass: string;
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
    sprLabelClass: string;
    sprInputClass: string;
    sprMetaClass: string;
    crossOutLineClass: string;
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
  review: {
    cardClass: string;
    headerClass: string;
    badgeClass: string;
    titleClass: string;
    descriptionClass: string;
    statsClass: string;
    flaggedIconClass: string;
    currentRingClass: string;
    actionsClass: string;
    secondaryButtonClass: string;
    primaryButtonClass: string;
  };
  dialog: {
    contentClass: string;
    iconPrimaryClass: string;
    iconDangerClass: string;
    titleClass: string;
    descriptionClass: string;
    cancelButtonClass: string;
    confirmButtonClass: string;
    dangerButtonClass: string;
  };
  report: {
    panelClass: string;
    titleClass: string;
    metaClass: string;
    closeButtonClass: string;
    labelClass: string;
    optionActiveClass: string;
    optionIdleClass: string;
    textareaClass: string;
    successMessageClass: string;
    errorMessageClass: string;
    neutralMessageClass: string;
    submitButtonClass: string;
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
    cardTitle: "Ronan SAT testing room",
    description: "The chunky workbook classic, with highlighter pop and cozy grit.",
    accentClass: "bg-primary text-ink-fg",
    shell: {
      rootClass: "bg-paper-bg selection:bg-primary/70",
      mainClass: "bg-dot-pattern bg-paper-bg",
    },
    header: {
      shellClass: "border-b-4 border-ink-fg bg-surface-white",
      titleClass: "font-display font-black uppercase text-ink-fg",
      timerShellClass:
        "rounded-2xl border-2 border-ink-fg bg-paper-bg brutal-shadow-sm",
      timerTextClass: "text-ink-fg",
      timerWarningTextClass: "animate-pulse text-accent-3",
      timerHiddenTextClass: "text-ink-fg/40",
      iconButtonClass:
        "border-2 border-ink-fg bg-surface-white text-ink-fg workbook-press",
      mobileMenuClass:
        "rounded-2xl border-2 border-ink-fg bg-surface-white p-3 brutal-shadow",
      mobileMenuSectionClass:
        "rounded-2xl border-2 border-ink-fg bg-paper-bg px-3 py-2",
      mobileMenuLabelClass: "text-ink-fg/70",
      mobileMenuSecondaryActionClass:
        "border-2 border-ink-fg bg-surface-white text-ink-fg workbook-press",
      mobileMenuActionShapeClass: "rounded-2xl",
      submitPrimaryClass:
        "!rounded-2xl !border-2 !border-ink-fg !bg-primary !text-ink-fg",
      submitDangerClass:
        "!rounded-2xl !border-2 !border-ink-fg !bg-accent-3 !text-white",
      leaveButtonClass:
        "border-2 border-ink-fg bg-surface-white workbook-press",
      leaveButtonShapeClass: "rounded-2xl border-2",
      reportTriggerClass:
        "border-2 border-ink-fg bg-paper-bg text-ink-fg workbook-press",
    },
    footer: {
      modalClass: "workbook-modal-card",
      modalHeaderClass: "border-b-2 border-ink-fg",
      modalTitleClass: "font-display font-black uppercase text-ink-fg",
      modalCloseButtonClass:
        "border-2 border-ink-fg bg-surface-white text-ink-fg workbook-press",
      modalLegendClass: "border-b-2 border-ink-fg text-ink-fg",
      unansweredLegendClass: "border-2 border-dashed border-ink-fg",
      gridAnsweredClass: "border-2 border-ink-fg bg-accent-2 text-white",
      gridUnansweredClass:
        "border-2 border-dashed border-ink-fg bg-surface-white text-ink-fg",
      currentPinClass: "text-ink-fg",
      modalActionButtonClass:
        "workbook-button workbook-button-secondary px-6 py-2 text-sm",
      barClass: "border-t-4 border-ink-fg bg-surface-white",
      displayNameClass: "text-ink-fg",
      navigatorButtonClass:
        "workbook-button flex items-center bg-ink-fg/55 px-4 py-2 text-sm text-paper-bg hover:bg-ink-fg/65",
      secondaryNavButtonClass:
        "workbook-button workbook-button-secondary px-6 py-1.5 text-sm",
      primaryNavButtonClass: "workbook-button px-6 py-1.5 text-sm",
    },
    viewer: {
      rootClass: "bg-surface-white",
      readingFontClass:
        "[font-family:Georgia,'Times_New_Roman',Times,serif]",
      leftPanelClass: "bg-surface-white md:border-r-4 md:border-ink-fg",
      imageCardClass: "rounded-2xl border-2 border-ink-fg brutal-shadow-sm",
      passageClass:
        "rounded-2xl border-2 border-ink-fg text-ink-fg selection:bg-primary",
      annotationToolbarClass:
        "rounded-2xl border-2 border-ink-fg bg-surface-white brutal-shadow-sm",
      annotationAddButtonClass:
        "rounded-full border-2 border-ink-fg bg-accent-1 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-fg brutal-shadow-sm workbook-press",
      annotationSwatchButtonClass:
        "rounded-full border-2 border-ink-fg transition-transform workbook-press",
      annotationSwatchActiveClass: "scale-105",
      annotationIconButtonClass:
        "rounded-full border-2 border-ink-fg bg-surface-white text-ink-fg transition-colors workbook-press",
      annotationIconButtonActiveClass: "bg-paper-bg",
      annotationDeleteButtonClass:
        "rounded-full border-2 border-ink-fg bg-surface-white text-ink-fg transition-colors workbook-press disabled:cursor-not-allowed disabled:opacity-40",
      dividerTrackClass: "bg-ink-fg/15 hover:bg-ink-fg/25",
      dividerHandleClass: "bg-ink-fg",
      questionNumberClass: "border-2 border-ink-fg bg-primary text-ink-fg",
      questionToolbarClass: "border-y-2 border-r-2 border-ink-fg bg-paper-bg",
      flagDefaultClass: "text-ink-fg",
      flagActiveClass: "text-accent-3 underline underline-offset-2",
      flagIconActiveClass: "fill-current text-accent-3",
      eliminationIdleClass:
        "border-2 border-ink-fg bg-surface-white text-ink-fg",
      eliminationActiveClass: "border-2 border-ink-fg bg-accent-2 text-white",
      sectionRuleClass: "h-[2px] bg-ink-fg",
      promptClass: "rounded-2xl border-2 border-ink-fg text-ink-fg",
      sprLabelClass: "text-ink-fg",
      sprInputClass:
        "workbook-input max-w-sm [font-family:Georgia,'Times_New_Roman',Times,serif]",
      sprMetaClass: "text-ink-fg/70",
      crossOutLineClass: "bg-ink-fg",
      answerCrossedClass:
        "cursor-default rounded-2xl border-2 border-ink-fg bg-paper-bg brutal-shadow-sm",
      answerSelectedClass:
        "rounded-2xl border-2 border-ink-fg bg-primary brutal-shadow-sm",
      answerIdleClass:
        "rounded-2xl border-2 border-ink-fg bg-surface-white brutal-shadow-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-paper-bg active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
      optionBadgeCrossedClass:
        "border-2 border-ink-fg bg-surface-white text-ink-fg/50",
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
      controlButtonClass:
        "border-2 border-ink-fg bg-surface-white text-ink-fg workbook-press",
      bodyClass: "bg-white",
    },
    review: {
      cardClass: "workbook-panel w-full max-w-3xl overflow-hidden bg-surface-white",
      headerClass: "border-b-4 border-ink-fg bg-paper-bg px-6 py-5 sm:px-8",
      badgeClass: "workbook-sticker bg-primary text-ink-fg",
      titleClass: "font-display text-3xl font-black uppercase tracking-tight text-ink-fg sm:text-4xl",
      descriptionClass: "mt-3 text-sm leading-6 text-ink-fg/75 sm:text-base",
      statsClass: "grid gap-3 border-b-2 border-ink-fg bg-white px-6 py-4 text-sm font-semibold text-ink-fg sm:grid-cols-3 sm:px-8",
      flaggedIconClass: "fill-current text-accent-3",
      currentRingClass: "ring-2 ring-accent-2 ring-offset-2 ring-offset-surface-white",
      actionsClass: "flex flex-col gap-3 border-t-2 border-ink-fg bg-paper-bg px-6 py-5 sm:flex-row sm:justify-end sm:px-8",
      secondaryButtonClass: "workbook-button workbook-button-secondary justify-center",
      primaryButtonClass: "workbook-button justify-center",
    },
    dialog: {
      contentClass: "",
      iconPrimaryClass:
        "inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink-fg bg-primary text-ink-fg brutal-shadow-sm sm:h-11 sm:w-11",
      iconDangerClass:
        "inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink-fg bg-[var(--color-accent-3)] text-surface-white brutal-shadow-sm sm:h-11 sm:w-11",
      titleClass: "",
      descriptionClass: "",
      cancelButtonClass: "",
      confirmButtonClass: "!bg-primary !text-ink-fg",
      dangerButtonClass: "",
    },
    report: {
      panelClass:
        "rounded-2xl border-2 border-ink-fg bg-surface-white p-4 brutal-shadow",
      titleClass: "text-sm font-black uppercase tracking-[0.14em] text-ink-fg",
      metaClass: "mt-1 text-[11px] leading-4 text-ink-fg/70",
      closeButtonClass:
        "rounded-full border-2 border-ink-fg bg-paper-bg p-1 text-ink-fg workbook-press",
      labelClass:
        "mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-fg/70",
      optionActiveClass: "border-2 border-ink-fg bg-primary text-ink-fg",
      optionIdleClass: "border-2 border-ink-fg bg-surface-white text-ink-fg",
      textareaClass: "workbook-input min-h-[96px]",
      successMessageClass: "text-accent-2",
      errorMessageClass: "text-accent-3",
      neutralMessageClass: "text-ink-fg/50",
      submitButtonClass: "workbook-button disabled:opacity-60",
    },
    preview: {
      canvasClass: "bg-paper-bg",
      frameClass: "border-2 border-ink-fg bg-[#f8f4ea] brutal-shadow-sm",
      topBarClass: "border-b-2 border-ink-fg bg-[#f3ecdd]",
      topBarAccentClass: "border-2 border-ink-fg bg-primary",
      topBarControlClass: "border-2 border-ink-fg bg-surface-white",
      leftPaneClass:
        "border-r-2 border-ink-fg bg-[radial-gradient(rgba(15,14,14,0.14)_1px,transparent_1px)] bg-[size:10px_10px]",
      leftPaneCardClass: "border-2 border-ink-fg bg-white",
      rightMetaClass: "bg-ink-fg/80",
      rightAnswerSelectedClass: "rounded-lg border-2 border-ink-fg bg-primary",
      rightAnswerIdleClass:
        "rounded-lg border-2 border-ink-fg bg-surface-white",
    },
  },
  collegeboard: {
    label: "College Board",
    cardTitle: "Bluebook-style testing room",
    description: "A cleaner, calmer room with cool tones and polite little borders.",
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
      iconButtonClass:
        "border border-[#bdbdbd] bg-white text-[#202124] transition-colors hover:bg-[#f4f6f8]",
      mobileMenuClass:
        "rounded-[28px] border border-[#c7c7c7] bg-white p-3 shadow-[0_14px_40px_rgba(0,0,0,0.12)]",
      mobileMenuSectionClass:
        "rounded-[22px] border border-[#d0d4d9] bg-[#f8f9fa] px-3 py-2",
      mobileMenuLabelClass: "text-[#5f6368]",
      mobileMenuSecondaryActionClass:
        "border border-[#bdbdbd] bg-white text-[#202124] transition-colors hover:bg-[#f4f6f8]",
      mobileMenuActionShapeClass: "rounded-full",
      submitPrimaryClass:
        "!rounded-full !border !border-[#1a73e8] !bg-[#1a73e8] !text-white",
      submitDangerClass:
        "!rounded-full !border !border-[#b3261e] !bg-[#d93025] !text-white",
      leaveButtonClass:
        "border border-[#bdbdbd] bg-white text-[#202124] transition-colors hover:bg-[#f4f6f8]",
      leaveButtonShapeClass: "rounded-full border",
      reportTriggerClass:
        "border border-[#bdbdbd] bg-white text-[#202124] transition-colors hover:bg-[#f4f6f8]",
    },
    footer: {
      modalClass:
        "rounded-[26px] border border-[#c7c7c7] bg-white shadow-[0_14px_40px_rgba(0,0,0,0.12)]",
      modalHeaderClass: "border-b border-[#d0d0d0]",
      modalTitleClass: "font-semibold text-[#202124]",
      modalCloseButtonClass:
        "border border-[#bdbdbd] bg-white text-[#202124] transition-colors hover:bg-[#f4f6f8]",
      modalLegendClass: "border-b border-[#d0d0d0] text-[#3c4043]",
      unansweredLegendClass: "border border-dashed border-[#9aa0a6]",
      gridAnsweredClass:
        "rounded-md border border-[#1a73e8] bg-[#1a73e8] text-white",
      gridUnansweredClass:
        "rounded-md border border-dashed border-[#9aa0a6] bg-surface-white text-[#202124]",
      currentPinClass: "text-[#202124]",
      modalActionButtonClass:
        "inline-flex items-center justify-center rounded-full border border-[#bdbdbd] bg-white px-6 py-2 text-sm font-semibold text-[#202124] transition-colors hover:bg-[#f4f6f8]",
      barClass: "border-t border-[#c7c7c7] bg-white",
      displayNameClass: "text-[#202124]",
      navigatorButtonClass:
        "flex items-center rounded-full bg-[#1f1f1f] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#353535]",
      secondaryNavButtonClass:
        "rounded-full border border-[#bdbdbd] bg-white px-6 py-1.5 text-sm font-semibold text-[#202124] transition-colors hover:bg-[#f4f6f8]",
      primaryNavButtonClass:
        "rounded-full border border-[#1a73e8] bg-[#1a73e8] px-6 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#1765cc]",
    },
    viewer: {
      rootClass: "bg-white",
      readingFontClass:
        "[font-family:Georgia,'Times_New_Roman',Times,serif]",
      leftPanelClass: "bg-white md:border-r md:border-[#cfd3d7]",
      imageCardClass: "rounded-2xl border border-[#d2d6da] bg-white",
      passageClass:
        "rounded-[16px] bg-white text-[#202124] selection:bg-[#d7e8ff]",
      annotationToolbarClass:
        "rounded-[26px] border border-[#c7c7c7] bg-white shadow-[0_14px_40px_rgba(0,0,0,0.12)]",
      annotationAddButtonClass:
        "rounded-full border border-[#1a73e8] bg-[#1a73e8] text-[11px] font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#1765cc]",
      annotationSwatchButtonClass: "rounded-full border border-[#9aa0a6] transition-transform",
      annotationSwatchActiveClass:
        "scale-105 border-[#1a73e8] ring-2 ring-[#d7e8ff]",
      annotationIconButtonClass:
        "rounded-full border border-[#bdbdbd] bg-white text-[#202124] transition-colors hover:bg-[#f4f6f8]",
      annotationIconButtonActiveClass:
        "border-[#8ab4f8] bg-[#e8f0fe] text-[#1a73e8]",
      annotationDeleteButtonClass:
        "rounded-full border border-[#bdbdbd] bg-white text-[#202124] transition-colors hover:bg-[#f4f6f8] disabled:cursor-not-allowed disabled:opacity-40",
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
      sprLabelClass: "text-[#202124]",
      sprInputClass:
        "w-full max-w-sm rounded-[14px] border border-[#c7cdd3] bg-white px-4 py-3 text-[#202124] outline-none [font-family:Georgia,'Times_New_Roman',Times,serif] focus:border-[#8ab4f8]",
      sprMetaClass: "text-[#5f6368]",
      crossOutLineClass: "bg-[#5f6368]",
      answerCrossedClass:
        "cursor-default rounded-[14px] border border-[#d0d4d9] bg-[#f8f9fa]",
      answerSelectedClass:
        "rounded-[14px] border border-[#8ab4f8] bg-[#e8f0fe]",
      answerIdleClass:
        "rounded-[14px] border border-[#c7cdd3] bg-white hover:border-[#9aa0a6]",
      optionBadgeCrossedClass:
        "border border-[#c7cdd3] bg-white text-[#5f6368]",
      optionBadgeSelectedClass:
        "border border-[#1a73e8] bg-[#1a73e8] text-white",
      optionBadgeIdleClass: "border border-[#9aa0a6] bg-white text-[#202124]",
      choiceTextClass: "text-[#202124]",
      choiceCrossedTextClass: "text-[#5f6368]",
    },
    desmos: {
      modalClass:
        "border border-[#c7c7c7] bg-white shadow-[0_18px_48px_rgba(0,0,0,0.18)]",
      headerClass: "border-b border-[#d0d4d9] bg-[#f8f9fa] text-[#202124]",
      badgeClass:
        "inline-flex items-center rounded-full border border-[#c7c7c7] bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#1a73e8]",
      titleClass: "font-semibold text-[#202124]",
      controlButtonClass:
        "border border-[#b8bec5] bg-white text-[#202124] transition-colors hover:bg-[#eef2f5]",
      bodyClass: "bg-white",
    },
    review: {
      cardClass:
        "w-full max-w-3xl overflow-hidden rounded-[28px] border border-[#cfd3d7] bg-white shadow-[0_14px_40px_rgba(0,0,0,0.12)]",
      headerClass: "border-b border-[#d7dbe0] bg-white px-6 py-5 sm:px-8",
      badgeClass: "inline-flex items-center rounded-full border border-[#1a73e8] bg-[#e8f0fe] px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#1a73e8]",
      titleClass: "text-3xl font-semibold tracking-tight text-[#202124] sm:text-4xl",
      descriptionClass: "mt-3 text-sm leading-6 text-[#5f6368] sm:text-base",
      statsClass: "grid gap-3 border-b border-[#d7dbe0] bg-[#f8f9fa] px-6 py-4 text-sm font-semibold text-[#202124] sm:grid-cols-3 sm:px-8",
      flaggedIconClass: "fill-current text-[#1a73e8]",
      currentRingClass: "ring-2 ring-[#8ab4f8] ring-offset-2 ring-offset-white",
      actionsClass: "flex flex-col gap-3 border-t border-[#d7dbe0] bg-[#f8f9fa] px-6 py-5 sm:flex-row sm:justify-end sm:px-8",
      secondaryButtonClass: "inline-flex items-center justify-center rounded-full border border-[#bdbdbd] bg-white px-6 py-3 text-sm font-semibold text-[#202124] transition-colors hover:bg-[#f4f6f8]",
      primaryButtonClass: "inline-flex items-center justify-center rounded-full border border-[#1a73e8] bg-[#1a73e8] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1765cc]",
    },
    dialog: {
      contentClass:
        "!rounded-[28px] !border !border-[#cfd3d7] !bg-white !shadow-[0_14px_40px_rgba(0,0,0,0.12)]",
      iconPrimaryClass:
        "inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#1a73e8] bg-[#e8f0fe] text-[#1a73e8] sm:h-11 sm:w-11",
      iconDangerClass:
        "inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#d93025] bg-[#fce8e6] text-[#d93025] sm:h-11 sm:w-11",
      titleClass: "!font-semibold !normal-case !tracking-normal !text-[#202124]",
      descriptionClass: "!text-[#5f6368] !sm:text-base",
      cancelButtonClass:
        "!rounded-full !border !border-[#bdbdbd] !bg-white !text-[#202124] hover:!bg-[#f4f6f8]",
      confirmButtonClass:
        "!rounded-full !border !border-[#1a73e8] !bg-[#1a73e8] !text-white hover:!bg-[#1765cc]",
      dangerButtonClass:
        "!rounded-full !border !border-[#d93025] !bg-[#d93025] !text-white hover:!bg-[#c5221f]",
    },
    report: {
      panelClass:
        "rounded-[28px] border border-[#cfd3d7] bg-white p-4 shadow-[0_14px_40px_rgba(0,0,0,0.12)]",
      titleClass: "text-sm font-semibold uppercase tracking-[0.18em] text-[#202124]",
      metaClass: "mt-1 text-[11px] leading-4 text-[#5f6368]",
      closeButtonClass:
        "rounded-full border border-[#bdbdbd] bg-white p-1 text-[#202124] transition-colors hover:bg-[#f4f6f8]",
      labelClass:
        "mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5f6368]",
      optionActiveClass: "border border-[#1a73e8] bg-[#e8f0fe] text-[#1a73e8]",
      optionIdleClass: "border border-[#bdbdbd] bg-white text-[#202124] hover:bg-[#f4f6f8]",
      textareaClass:
        "min-h-[96px] w-full rounded-[18px] border border-[#c7cdd3] bg-white px-4 py-3 text-[#202124] outline-none placeholder:text-[#8a9097] focus:border-[#8ab4f8]",
      successMessageClass: "text-[#1a73e8]",
      errorMessageClass: "text-[#d93025]",
      neutralMessageClass: "text-[#5f6368]",
      submitButtonClass:
        "inline-flex items-center justify-center rounded-full border border-[#1a73e8] bg-[#1a73e8] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1765cc] disabled:opacity-60",
    },
    preview: {
      canvasClass: "bg-[#f3f4f6]",
      frameClass:
        "border border-[#cfd3d7] bg-white shadow-[0_6px_14px_rgba(0,0,0,0.08)]",
      topBarClass: "border-b border-[#d7dbe0] bg-white",
      topBarAccentClass: "bg-[#2d2d2d]",
      topBarControlClass: "border border-[#c7c7c7] bg-white",
      leftPaneClass: "border-r border-[#d7dbe0] bg-white",
      leftPaneCardClass: "border border-[#d7dbe0] bg-white",
      rightMetaClass: "bg-[#444746]",
      rightAnswerSelectedClass:
        "rounded-xl border border-[#8ab4f8] bg-[#e8f0fe]",
      rightAnswerIdleClass: "rounded-xl border border-[#cfd3d7] bg-white",
    },
  },
  bookerly: {
    label: "Bookerly",
    cardTitle: "Warm reading room",
    description:
      "A calm parchment mode with Kindle-like warmth, softer contrast, and bookish serif rhythm.",
    accentClass: "bg-[#e6c98c] text-[#4b3723]",
    shell: {
      rootClass:
        "bg-[#f3eadb] text-[#433224] selection:bg-[#e6c98c]/70 selection:text-[#2f2318]",
      mainClass:
        "bg-[#f3eadb] [background-image:linear-gradient(rgba(92,67,44,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(92,67,44,0.045)_1px,transparent_1px)] [background-size:24px_24px]",
    },
    header: {
      shellClass: "border-b-4 border-[#6f5337] bg-[#fbf5ea] text-[#433224]",
      titleClass: "font-display font-black uppercase text-[#4b3723]",
      timerShellClass:
        "rounded-2xl border-2 border-[#8b6b49] bg-[#f7efe1] shadow-[3px_3px_0px_#c8a77a]",
      timerTextClass: "text-[#4b3723]",
      timerWarningTextClass: "animate-pulse text-[#9b4a18]",
      timerHiddenTextClass: "text-[#6f5a46]",
      iconButtonClass:
        "border-2 border-[#8b6b49] bg-[#fdf8f0] text-[#4b3723] shadow-[3px_3px_0px_#d2b48c] transition-colors hover:bg-[#f7efe1] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
      mobileMenuClass:
        "rounded-2xl border-2 border-[#8b6b49] bg-[#fbf5ea] p-3 shadow-[6px_6px_0px_#d2b48c]",
      mobileMenuSectionClass:
        "rounded-2xl border-2 border-[#c8ae8b] bg-[#f7efe1] px-3 py-2",
      mobileMenuLabelClass: "text-[#6f5a46]",
      mobileMenuSecondaryActionClass:
        "border-2 border-[#8b6b49] bg-[#fdf8f0] text-[#4b3723] shadow-[3px_3px_0px_#d2b48c] transition-colors hover:bg-[#f7efe1] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
      mobileMenuActionShapeClass: "rounded-2xl",
      submitPrimaryClass:
        "!rounded-2xl !border-2 !border-[#8b6b49] !bg-[#e6c98c] !text-[#4b3723] shadow-[3px_3px_0px_#d2b48c] hover:!bg-[#edd4a0] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
      submitDangerClass:
        "!rounded-2xl !border-2 !border-[#9b5e32] !bg-[#c97a42] !text-[#fffaf2] shadow-[3px_3px_0px_#d2b48c] hover:!bg-[#d4864d] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
      leaveButtonClass:
        "border-2 border-[#8b6b49] bg-[#fdf8f0] text-[#4b3723] shadow-[3px_3px_0px_#d2b48c] transition-colors hover:bg-[#f7efe1] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
      leaveButtonShapeClass: "rounded-2xl border-2",
      reportTriggerClass:
        "border-2 border-[#8b6b49] bg-[#f7efe1] text-[#4b3723] shadow-[3px_3px_0px_#d2b48c] transition-colors hover:bg-[#f1e6d3] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
    },
    footer: {
      modalClass:
        "rounded-[2rem] border-2 border-[#8b6b49] bg-[#fbf5ea] shadow-[12px_12px_0px_#d2b48c]",
      modalHeaderClass: "border-b-2 border-[#c8ae8b]",
      modalTitleClass: "font-display font-black uppercase text-[#4b3723]",
      modalCloseButtonClass:
        "border-2 border-[#8b6b49] bg-[#fdf8f0] text-[#4b3723] shadow-[3px_3px_0px_#d2b48c] transition-colors hover:bg-[#f7efe1] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
      modalLegendClass: "border-b-2 border-[#c8ae8b] text-[#6f5a46]",
      unansweredLegendClass: "border-2 border-dashed border-[#b59671]",
      gridAnsweredClass:
        "rounded-xl border-2 border-[#8b6b49] bg-[#d2b48c] text-[#3d2f21] shadow-[3px_3px_0px_#e4cfb0]",
      gridUnansweredClass:
        "rounded-xl border-2 border-dashed border-[#b59671] bg-[#fdf8f0] text-[#4b3723]",
      currentPinClass: "text-[#4b3723]",
      modalActionButtonClass:
        "inline-flex items-center justify-center rounded-2xl border-2 border-[#8b6b49] bg-[#fdf8f0] px-6 py-2 text-sm font-semibold text-[#4b3723] shadow-[3px_3px_0px_#d2b48c] transition-colors hover:bg-[#f7efe1] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
      barClass: "border-t-4 border-[#6f5337] bg-[#fbf5ea]",
      displayNameClass: "text-[#6f5a46]",
      navigatorButtonClass:
        "flex items-center rounded-2xl border-2 border-[#8b6b49] bg-[#5a4634] px-4 py-2 text-sm font-semibold text-[#fff8ef] shadow-[3px_3px_0px_#c9ac86] transition-colors hover:bg-[#69513d] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
      secondaryNavButtonClass:
        "rounded-2xl border-2 border-[#8b6b49] bg-[#fdf8f0] px-6 py-1.5 text-sm font-semibold text-[#4b3723] shadow-[3px_3px_0px_#d2b48c] transition-colors hover:bg-[#f7efe1] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
      primaryNavButtonClass:
        "rounded-2xl border-2 border-[#8b6b49] bg-[#e6c98c] px-6 py-1.5 text-sm font-semibold text-[#4b3723] shadow-[3px_3px_0px_#d2b48c] transition-colors hover:bg-[#edd4a0] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
    },
    viewer: {
      rootClass: "bg-[#f7efe1]",
      readingFontClass:
        "[font-family:Bookerly,'Iowan_Old_Style','Palatino_Linotype','URW_Palladio_L',Palatino,'Book_Antiqua',Georgia,serif] tracking-[0.002em]",
      leftPanelClass: "bg-[#f5ede0] md:border-r-4 md:border-[#d4b893]",
      imageCardClass:
        "rounded-[1.75rem] border-2 border-[#c8ae8b] bg-[#fdf8f0] shadow-[3px_3px_0px_#e0c6a2]",
      passageClass:
        "rounded-[1.75rem] border-2 border-[#dcc2a0] bg-[#fffaf2] text-[#433224] shadow-[3px_3px_0px_#ead7bb] selection:bg-[#e6c98c]/70",
      annotationToolbarClass:
        "rounded-[1.75rem] border-2 border-[#c8ae8b] bg-[#fbf5ea] shadow-[3px_3px_0px_#d9bd97]",
      annotationAddButtonClass:
        "rounded-full border-2 border-[#8b6b49] bg-[#e6c98c] text-[11px] font-bold uppercase tracking-[0.14em] text-[#4b3723] shadow-[3px_3px_0px_#d2b48c] transition-colors hover:bg-[#edd4a0] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
      annotationSwatchButtonClass:
        "rounded-full border-2 border-[#8b6b49] transition-transform active:translate-x-0.5 active:translate-y-0.5",
      annotationSwatchActiveClass:
        "scale-105 ring-2 ring-[#ead3af] ring-offset-2 ring-offset-[#fbf5ea]",
      annotationIconButtonClass:
        "rounded-full border-2 border-[#8b6b49] bg-[#fdf8f0] text-[#4b3723] shadow-[3px_3px_0px_#d2b48c] transition-colors hover:bg-[#f7efe1] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
      annotationIconButtonActiveClass: "bg-[#efe1ca] text-[#7f5d35]",
      annotationDeleteButtonClass:
        "rounded-full border-2 border-[#8b6b49] bg-[#fdf8f0] text-[#4b3723] shadow-[3px_3px_0px_#d2b48c] transition-colors hover:bg-[#f7efe1] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-40",
      dividerTrackClass: "bg-[#dcc8ad] hover:bg-[#ceb28d]",
      dividerHandleClass: "bg-[#8b6b49]",
      questionNumberClass:
        "border-2 border-[#8b6b49] bg-[#e6c98c] text-[#4b3723] shadow-[3px_3px_0px_#d2b48c]",
      questionToolbarClass:
        "border-y-2 border-r-2 border-[#d4b893] bg-[#f5ede0] text-[#4b3723]",
      flagDefaultClass: "text-[#5f4934]",
      flagActiveClass: "text-[#9b4a18] underline underline-offset-2",
      flagIconActiveClass: "fill-current text-[#9b4a18]",
      eliminationIdleClass:
        "border-2 border-[#b59671] bg-[#fffaf2] text-[#6a533e]",
      eliminationActiveClass:
        "border-2 border-[#8b6b49] bg-[#d7b179] text-[#3d2f21] shadow-[3px_3px_0px_#ead3af]",
      sectionRuleClass: "h-[2px] bg-[#d8c1a1]",
      promptClass:
        "rounded-[1.75rem] border-2 border-[#dcc2a0] bg-[#fffaf2] text-[#433224] shadow-[3px_3px_0px_#ead7bb]",
      sprLabelClass: "text-[#5a4533]",
      sprInputClass:
        "w-full max-w-sm rounded-[1.1rem] border-2 border-[#c8ae8b] bg-[#fffaf2] px-4 py-3 text-[#433224] outline-none shadow-[3px_3px_0px_#ead7bb] [font-family:Bookerly,'Iowan_Old_Style','Palatino_Linotype','URW_Palladio_L',Palatino,'Book_Antiqua',Georgia,serif] placeholder:text-[#9a8267] focus:border-[#b69267]",
      sprMetaClass: "text-[#6f5a46]",
      crossOutLineClass: "bg-[#7b5f44]",
      answerCrossedClass:
        "cursor-default rounded-[1.5rem] border-2 border-[#d4b893] bg-[#f4ebdc] shadow-[3px_3px_0px_#ead7bb]",
      answerSelectedClass:
        "rounded-[1.5rem] border-2 border-[#b0895f] bg-[#f0d8ad] text-[#3d2f21] shadow-[3px_3px_0px_#ddc096]",
      answerIdleClass:
        "rounded-[1.5rem] border-2 border-[#dcc2a0] bg-[#fffaf2] text-[#433224] shadow-[3px_3px_0px_#ead7bb] hover:bg-[#fdf4e6]",
      optionBadgeCrossedClass:
        "border-2 border-[#c8ae8b] bg-[#fbf5ea] text-[#8f7a62]",
      optionBadgeSelectedClass:
        "border-2 border-[#8b6b49] bg-[#5a4634] text-[#fff8ef]",
      optionBadgeIdleClass:
        "border-2 border-[#c8ae8b] bg-[#f5ede0] text-[#4b3723]",
      choiceTextClass: "text-[#433224]",
      choiceCrossedTextClass: "text-[#8f7a62]",
    },
    desmos: {
      modalClass:
        "border-2 border-[#8b6b49] bg-[#fbf5ea] shadow-[12px_12px_0px_#d2b48c]",
      headerClass: "border-b-4 border-[#c8ae8b] bg-[#f1e6d3] text-[#4b3723]",
      badgeClass:
        "inline-flex items-center rounded-full border-2 border-[#8b6b49] bg-[#e6c98c] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#4b3723] shadow-[3px_3px_0px_#d2b48c]",
      titleClass: "font-display font-black uppercase text-[#4b3723]",
      controlButtonClass:
        "border-2 border-[#8b6b49] bg-[#fdf8f0] text-[#4b3723] shadow-[3px_3px_0px_#d2b48c] transition-colors hover:bg-[#f7efe1] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
      bodyClass: "bg-[#fffaf2]",
    },
    review: {
      cardClass:
        "w-full max-w-3xl overflow-hidden rounded-[2rem] border-2 border-[#c8ae8b] bg-[#fbf5ea] shadow-[12px_12px_0px_#d2b48c]",
      headerClass: "border-b-2 border-[#d8c1a1] bg-[#f5ede0] px-6 py-5 sm:px-8",
      badgeClass:
        "inline-flex items-center rounded-full border-2 border-[#8b6b49] bg-[#e6c98c] px-4 py-2 text-[12px] font-bold uppercase tracking-[0.18em] text-[#4b3723] shadow-[3px_3px_0px_#d2b48c]",
      titleClass:
        "font-display text-3xl font-black uppercase tracking-tight text-[#4b3723] sm:text-4xl",
      descriptionClass: "mt-3 text-sm leading-6 text-[#6f5a46] sm:text-base",
      statsClass:
        "grid gap-3 border-b-2 border-[#d8c1a1] bg-[#fffaf2] px-6 py-4 text-sm font-semibold text-[#4b3723] sm:grid-cols-3 sm:px-8",
      flaggedIconClass: "fill-current text-[#9b4a18]",
      currentRingClass: "ring-2 ring-[#b0895f] ring-offset-2 ring-offset-[#fbf5ea]",
      actionsClass:
        "flex flex-col gap-3 border-t-2 border-[#d8c1a1] bg-[#f5ede0] px-6 py-5 sm:flex-row sm:justify-end sm:px-8",
      secondaryButtonClass:
        "inline-flex items-center justify-center rounded-2xl border-2 border-[#8b6b49] bg-[#fdf8f0] px-6 py-3 text-sm font-semibold text-[#4b3723] shadow-[3px_3px_0px_#d2b48c] transition-colors hover:bg-[#f7efe1] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
      primaryButtonClass:
        "inline-flex items-center justify-center rounded-2xl border-2 border-[#8b6b49] bg-[#e6c98c] px-6 py-3 text-sm font-semibold text-[#4b3723] shadow-[3px_3px_0px_#d2b48c] transition-colors hover:bg-[#edd4a0] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
    },
    dialog: {
      contentClass:
        "!rounded-[2rem] !border-2 !border-[#c8ae8b] !bg-[#fbf5ea] !text-[#4b3723] !shadow-[12px_12px_0px_#d2b48c]",
      iconPrimaryClass:
        "inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#8b6b49] bg-[#e6c98c] text-[#4b3723] shadow-[3px_3px_0px_#d2b48c] sm:h-11 sm:w-11",
      iconDangerClass:
        "inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#9b5e32] bg-[#c97a42] text-[#fff8ef] shadow-[3px_3px_0px_#d2b48c] sm:h-11 sm:w-11",
      titleClass: "!text-[#4b3723]",
      descriptionClass: "!text-[#6f5a46] !sm:text-base",
      cancelButtonClass:
        "!rounded-2xl !border-2 !border-[#8b6b49] !bg-[#fdf8f0] !text-[#4b3723] shadow-[3px_3px_0px_#d2b48c] hover:!bg-[#f7efe1] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
      confirmButtonClass:
        "!rounded-2xl !border-2 !border-[#8b6b49] !bg-[#e6c98c] !text-[#4b3723] shadow-[3px_3px_0px_#d2b48c] hover:!bg-[#edd4a0] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
      dangerButtonClass:
        "!rounded-2xl !border-2 !border-[#9b5e32] !bg-[#c97a42] !text-[#fff8ef] shadow-[3px_3px_0px_#d2b48c] hover:!bg-[#d4864d] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
    },
    report: {
      panelClass:
        "rounded-[2rem] border-2 border-[#c8ae8b] bg-[#fbf5ea] p-4 shadow-[12px_12px_0px_#d2b48c]",
      titleClass: "text-sm font-black uppercase tracking-[0.18em] text-[#4b3723]",
      metaClass: "mt-1 text-[11px] leading-4 text-[#6f5a46]",
      closeButtonClass:
        "rounded-full border-2 border-[#8b6b49] bg-[#fdf8f0] p-1 text-[#4b3723] shadow-[3px_3px_0px_#d2b48c] transition-colors hover:bg-[#f7efe1] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
      labelClass:
        "mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6f5a46]",
      optionActiveClass:
        "border-2 border-[#8b6b49] bg-[#e6c98c] text-[#4b3723] shadow-[3px_3px_0px_#d2b48c]",
      optionIdleClass:
        "border-2 border-[#c8ae8b] bg-[#fdf8f0] text-[#4b3723] shadow-[3px_3px_0px_#ead7bb] hover:bg-[#f7efe1]",
      textareaClass:
        "min-h-[96px] w-full rounded-2xl border-2 border-[#c8ae8b] bg-[#fffaf2] px-4 py-3 text-[#433224] outline-none shadow-[3px_3px_0px_#ead7bb] placeholder:text-[#9a8267] focus:border-[#b69267]",
      successMessageClass: "text-[#7f5d35]",
      errorMessageClass: "text-[#b2602f]",
      neutralMessageClass: "text-[#6f5a46]",
      submitButtonClass:
        "inline-flex items-center justify-center rounded-2xl border-2 border-[#8b6b49] bg-[#e6c98c] px-5 py-2.5 text-sm font-semibold text-[#4b3723] shadow-[3px_3px_0px_#d2b48c] transition-colors hover:bg-[#edd4a0] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-60",
    },
    preview: {
      canvasClass:
        "bg-[#f3eadb] [background-image:linear-gradient(rgba(92,67,44,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(92,67,44,0.06)_1px,transparent_1px)] [background-size:12px_12px]",
      frameClass:
        "border-2 border-[#c8ae8b] bg-[#fbf5ea] shadow-[3px_3px_0px_#d9bd97]",
      topBarClass: "border-b-2 border-[#dcc2a0] bg-[#f5ede0]",
      topBarAccentClass: "border-2 border-[#8b6b49] bg-[#e6c98c]",
      topBarControlClass: "border-2 border-[#c8ae8b] bg-[#fffaf2]",
      leftPaneClass:
        "border-r-2 border-[#dcc2a0] bg-[linear-gradient(180deg,rgba(255,250,242,1),rgba(247,239,225,1))]",
      leftPaneCardClass: "border-2 border-[#dcc2a0] bg-[#fffaf2]",
      rightMetaClass: "bg-[#8b6b49]",
      rightAnswerSelectedClass:
        "rounded-lg border-2 border-[#b0895f] bg-[#f0d8ad]",
      rightAnswerIdleClass:
        "rounded-lg border-2 border-[#dcc2a0] bg-[#fffaf2]",
    },
  },
  dracula: {
    label: "DRACULA",
    cardTitle: "Dracula testing room",
    description: "A moody midnight chamber: dark panels, red glow, vampire focus.",
    accentClass: "bg-[#b71c33] text-white",
    shell: {
      rootClass:
        "bg-[#090709] text-[#f6eaec] selection:bg-[#b71c33]/55 selection:text-white",
      mainClass:
        "bg-[#090709] [background-image:radial-gradient(circle_at_top,rgba(183,28,51,0.30),transparent_36%),linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:auto,24px_24px,24px_24px]",
    },
    header: {
      shellClass:
        "border-b-4 border-[#4a1823] bg-[#140f13] text-[#f6eaec]",
      titleClass: "font-display font-black uppercase text-[#fff4f5]",
      timerShellClass:
        "rounded-2xl border-2 border-[#5b1b28] bg-[#1a1217] shadow-[3px_3px_0px_#300d16]",
      timerTextClass: "text-[#fff4f5]",
      timerWarningTextClass: "animate-pulse text-[#ff7288]",
      timerHiddenTextClass: "text-[#f6eaec]/45",
      iconButtonClass:
        "border-2 border-[#5b1b28] bg-[#21161c] text-[#fff4f5] shadow-[3px_3px_0px_#300d16] transition-colors hover:bg-[#2a1b22] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
      mobileMenuClass:
        "rounded-2xl border-2 border-[#5b1b28] bg-[#140f13] p-3 shadow-[6px_6px_0px_#300d16]",
      mobileMenuSectionClass:
        "rounded-2xl border-2 border-[#41202a] bg-[#1b1419] px-3 py-2",
      mobileMenuLabelClass: "text-[#cdaeb5]",
      mobileMenuSecondaryActionClass:
        "border-2 border-[#5b1b28] bg-[#21161c] text-[#fff4f5] shadow-[3px_3px_0px_#300d16] transition-colors hover:bg-[#2a1b22] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
      mobileMenuActionShapeClass: "rounded-2xl",
      submitPrimaryClass:
        "!rounded-2xl !border-2 !border-[#5b1b28] !bg-[#b71c33] !text-white shadow-[3px_3px_0px_#300d16] hover:!bg-[#cb2b44] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
      submitDangerClass:
        "!rounded-2xl !border-2 !border-[#6f2634] !bg-[#de425a] !text-white shadow-[3px_3px_0px_#300d16] hover:!bg-[#e6556c] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
      leaveButtonClass:
        "border-2 border-[#5b1b28] bg-[#21161c] text-[#fff4f5] shadow-[3px_3px_0px_#300d16] transition-colors hover:bg-[#2a1b22] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
      leaveButtonShapeClass: "rounded-2xl border-2",
      reportTriggerClass:
        "border-2 border-[#5b1b28] bg-[#21161c] text-[#fff4f5] shadow-[3px_3px_0px_#300d16] transition-colors hover:bg-[#2a1b22] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
    },
    footer: {
      modalClass:
        "rounded-[2rem] border-2 border-[#5b1b28] bg-[#140f13] shadow-[12px_12px_0px_#300d16]",
      modalHeaderClass: "border-b-2 border-[#4a1823]",
      modalTitleClass: "font-display font-black uppercase text-[#fff4f5]",
      modalCloseButtonClass:
        "border-2 border-[#5b1b28] bg-[#21161c] text-[#fff4f5] shadow-[3px_3px_0px_#300d16] transition-colors hover:bg-[#2a1b22] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
      modalLegendClass: "border-b-2 border-[#4a1823] text-[#d7bcc1]",
      unansweredLegendClass: "border-2 border-dashed border-[#8e5f68]",
      gridAnsweredClass:
        "rounded-xl border-2 border-[#5b1b28] bg-[#b71c33] text-white shadow-[3px_3px_0px_#300d16]",
      gridUnansweredClass:
        "rounded-xl border-2 border-dashed border-[#8e5f68] bg-[#1b1419] text-[#fff4f5]",
      currentPinClass: "text-[#fff4f5]",
      modalActionButtonClass:
        "inline-flex items-center justify-center rounded-2xl border-2 border-[#5b1b28] bg-[#21161c] px-6 py-2 text-sm font-semibold text-[#fff4f5] shadow-[3px_3px_0px_#300d16] transition-colors hover:bg-[#2a1b22] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
      barClass: "border-t-4 border-[#4a1823] bg-[#140f13]",
      displayNameClass: "text-[#d7bcc1]",
      navigatorButtonClass:
        "flex items-center rounded-2xl border-2 border-[#5b1b28] bg-[#21161c] px-4 py-2 text-sm font-semibold text-[#fff4f5] shadow-[3px_3px_0px_#300d16] transition-colors hover:bg-[#2a1b22] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
      secondaryNavButtonClass:
        "rounded-2xl border-2 border-[#5b1b28] bg-[#21161c] px-6 py-1.5 text-sm font-semibold text-[#fff4f5] shadow-[3px_3px_0px_#300d16] transition-colors hover:bg-[#2a1b22] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
      primaryNavButtonClass:
        "rounded-2xl border-2 border-[#5b1b28] bg-[#b71c33] px-6 py-1.5 text-sm font-semibold text-white shadow-[3px_3px_0px_#300d16] transition-colors hover:bg-[#cb2b44] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
    },
    viewer: {
      rootClass: "bg-[#110d11]",
      readingFontClass:
        "[font-family:Georgia,'Times_New_Roman',Times,serif]",
      leftPanelClass: "bg-[#140f13] md:border-r-4 md:border-[#4a1823]",
      imageCardClass:
        "rounded-2xl border-2 border-[#5b1b28] bg-[#1b1419] shadow-[3px_3px_0px_#300d16]",
      passageClass:
        "rounded-2xl border-2 border-[#5b1b28] bg-[#1b1419] text-[#f6eaec] selection:bg-[#b71c33]/60",
      annotationToolbarClass:
        "rounded-2xl border-2 border-[#5b1b28] bg-[#140f13] shadow-[3px_3px_0px_#300d16]",
      annotationAddButtonClass:
        "rounded-full border-2 border-[#5b1b28] bg-[#b71c33] text-[11px] font-bold uppercase tracking-[0.14em] text-white shadow-[3px_3px_0px_#300d16] transition-colors hover:bg-[#cb2b44] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
      annotationSwatchButtonClass:
        "rounded-full border-2 border-[#5b1b28] transition-transform active:translate-x-0.5 active:translate-y-0.5",
      annotationSwatchActiveClass: "scale-105",
      annotationIconButtonClass:
        "rounded-full border-2 border-[#5b1b28] bg-[#21161c] text-[#fff4f5] shadow-[3px_3px_0px_#300d16] transition-colors hover:bg-[#2a1b22] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
      annotationIconButtonActiveClass: "bg-[#2d1a22] text-[#ff7288]",
      annotationDeleteButtonClass:
        "rounded-full border-2 border-[#5b1b28] bg-[#21161c] text-[#fff4f5] shadow-[3px_3px_0px_#300d16] transition-colors hover:bg-[#2a1b22] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-40",
      dividerTrackClass: "bg-[#2d1a22] hover:bg-[#3a202a]",
      dividerHandleClass: "bg-[#b71c33]",
      questionNumberClass:
        "border-2 border-[#5b1b28] bg-[#b71c33] text-white shadow-[3px_3px_0px_#300d16]",
      questionToolbarClass:
        "border-y-2 border-r-2 border-[#5b1b28] bg-[#140f13] text-[#f6eaec]",
      flagDefaultClass: "text-[#d7bcc1]",
      flagActiveClass: "text-[#ff7288] underline underline-offset-2",
      flagIconActiveClass: "fill-current text-[#ff7288]",
      eliminationIdleClass:
        "border-2 border-[#5b1b28] bg-[#21161c] text-[#f6eaec]",
      eliminationActiveClass:
        "border-2 border-[#5b1b28] bg-[#b71c33] text-white shadow-[3px_3px_0px_#300d16]",
      sectionRuleClass: "h-[2px] bg-[#4a1823]",
      promptClass:
        "rounded-2xl border-2 border-[#5b1b28] bg-[#140f13] text-[#f6eaec]",
      sprLabelClass: "text-[#f6eaec]",
      sprInputClass:
        "w-full max-w-sm rounded-2xl border-2 border-[#5b1b28] bg-[#1b1419] px-4 py-3 text-[#fff4f5] outline-none shadow-[3px_3px_0px_#300d16] [font-family:Georgia,'Times_New_Roman',Times,serif] placeholder:text-[#9b7f86] focus:border-[#b71c33]",
      sprMetaClass: "text-[#cdaeb5]",
      crossOutLineClass: "bg-[#f3dce0]",
      answerCrossedClass:
        "cursor-default rounded-2xl border-2 border-[#5b1b28] bg-[#1b1419] shadow-[3px_3px_0px_#300d16]",
      answerSelectedClass:
        "rounded-2xl border-2 border-[#5b1b28] bg-[#b71c33] text-white shadow-[3px_3px_0px_#300d16]",
      answerIdleClass:
        "rounded-2xl border-2 border-[#5b1b28] bg-[#140f13] text-[#f6eaec] shadow-[3px_3px_0px_#300d16] hover:bg-[#1b1419]",
      optionBadgeCrossedClass:
        "border-2 border-[#8e5f68] bg-[#21161c] text-[#b899a0]",
      optionBadgeSelectedClass:
        "border-2 border-[#5b1b28] bg-[#fff4f5] text-[#8e1326]",
      optionBadgeIdleClass:
        "border-2 border-[#5b1b28] bg-[#21161c] text-[#fff4f5]",
      choiceTextClass: "text-[#f6eaec]",
      choiceCrossedTextClass: "text-[#b899a0]",
    },
    desmos: {
      modalClass:
        "border-2 border-[#5b1b28] bg-[#140f13] shadow-[12px_12px_0px_#300d16]",
      headerClass: "border-b-4 border-[#4a1823] bg-[#1b1419] text-[#fff4f5]",
      badgeClass:
        "inline-flex items-center rounded-full border-2 border-[#5b1b28] bg-[#b71c33] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white shadow-[3px_3px_0px_#300d16]",
      titleClass: "font-display font-black uppercase text-[#fff4f5]",
      controlButtonClass:
        "border-2 border-[#5b1b28] bg-[#21161c] text-[#fff4f5] shadow-[3px_3px_0px_#300d16] transition-colors hover:bg-[#2a1b22] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
      bodyClass: "bg-[#0f0b0f]",
    },
    review: {
      cardClass:
        "w-full max-w-3xl overflow-hidden rounded-[2rem] border-2 border-[#5b1b28] bg-[#140f13] shadow-[12px_12px_0px_#300d16]",
      headerClass: "border-b-2 border-[#4a1823] bg-[#1b1419] px-6 py-5 sm:px-8",
      badgeClass: "inline-flex items-center rounded-full border-2 border-[#5b1b28] bg-[#b71c33] px-4 py-2 text-[12px] font-bold uppercase tracking-[0.18em] text-white shadow-[3px_3px_0px_#300d16]",
      titleClass: "font-display text-3xl font-black uppercase tracking-tight text-[#fff4f5] sm:text-4xl",
      descriptionClass: "mt-3 text-sm leading-6 text-[#cdaeb5] sm:text-base",
      statsClass: "grid gap-3 border-b-2 border-[#4a1823] bg-[#140f13] px-6 py-4 text-sm font-semibold text-[#fff4f5] sm:grid-cols-3 sm:px-8",
      flaggedIconClass: "fill-current text-[#ff7288]",
      currentRingClass: "ring-2 ring-[#ff7288] ring-offset-2 ring-offset-[#140f13]",
      actionsClass: "flex flex-col gap-3 border-t-2 border-[#4a1823] bg-[#1b1419] px-6 py-5 sm:flex-row sm:justify-end sm:px-8",
      secondaryButtonClass: "inline-flex items-center justify-center rounded-2xl border-2 border-[#5b1b28] bg-[#21161c] px-6 py-3 text-sm font-semibold text-[#fff4f5] shadow-[3px_3px_0px_#300d16] transition-colors hover:bg-[#2a1b22] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
      primaryButtonClass: "inline-flex items-center justify-center rounded-2xl border-2 border-[#5b1b28] bg-[#b71c33] px-6 py-3 text-sm font-semibold text-white shadow-[3px_3px_0px_#300d16] transition-colors hover:bg-[#cb2b44] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
    },
    dialog: {
      contentClass:
        "!rounded-[2rem] !border-2 !border-[#5b1b28] !bg-[#140f13] !text-[#fff4f5] !shadow-[12px_12px_0px_#300d16]",
      iconPrimaryClass:
        "inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#5b1b28] bg-[#b71c33] text-white shadow-[3px_3px_0px_#300d16] sm:h-11 sm:w-11",
      iconDangerClass:
        "inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#6f2634] bg-[#de425a] text-white shadow-[3px_3px_0px_#300d16] sm:h-11 sm:w-11",
      titleClass: "!text-[#fff4f5]",
      descriptionClass: "!text-[#cdaeb5] !sm:text-base",
      cancelButtonClass:
        "!rounded-2xl !border-2 !border-[#5b1b28] !bg-[#21161c] !text-[#fff4f5] shadow-[3px_3px_0px_#300d16] hover:!bg-[#2a1b22] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
      confirmButtonClass:
        "!rounded-2xl !border-2 !border-[#5b1b28] !bg-[#b71c33] !text-white shadow-[3px_3px_0px_#300d16] hover:!bg-[#cb2b44] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
      dangerButtonClass:
        "!rounded-2xl !border-2 !border-[#6f2634] !bg-[#de425a] !text-white shadow-[3px_3px_0px_#300d16] hover:!bg-[#e6556c] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
    },
    report: {
      panelClass:
        "rounded-[2rem] border-2 border-[#5b1b28] bg-[#140f13] p-4 shadow-[12px_12px_0px_#300d16]",
      titleClass: "text-sm font-black uppercase tracking-[0.18em] text-[#fff4f5]",
      metaClass: "mt-1 text-[11px] leading-4 text-[#cdaeb5]",
      closeButtonClass:
        "rounded-full border-2 border-[#5b1b28] bg-[#21161c] p-1 text-[#fff4f5] shadow-[3px_3px_0px_#300d16] transition-colors hover:bg-[#2a1b22] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
      labelClass:
        "mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#cdaeb5]",
      optionActiveClass: "border-2 border-[#5b1b28] bg-[#b71c33] text-white shadow-[3px_3px_0px_#300d16]",
      optionIdleClass: "border-2 border-[#5b1b28] bg-[#21161c] text-[#fff4f5] shadow-[3px_3px_0px_#300d16] hover:bg-[#2a1b22]",
      textareaClass:
        "min-h-[96px] w-full rounded-2xl border-2 border-[#5b1b28] bg-[#1b1419] px-4 py-3 text-[#fff4f5] outline-none shadow-[3px_3px_0px_#300d16] placeholder:text-[#9b7f86] focus:border-[#b71c33]",
      successMessageClass: "text-[#ff7288]",
      errorMessageClass: "text-[#de425a]",
      neutralMessageClass: "text-[#cdaeb5]",
      submitButtonClass:
        "inline-flex items-center justify-center rounded-2xl border-2 border-[#5b1b28] bg-[#b71c33] px-5 py-2.5 text-sm font-semibold text-white shadow-[3px_3px_0px_#300d16] transition-colors hover:bg-[#cb2b44] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-60",
    },
    preview: {
      canvasClass:
        "bg-[#090709] [background-image:radial-gradient(circle_at_top,rgba(183,28,51,0.34),transparent_38%),linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:auto,16px_16px,16px_16px]",
      frameClass:
        "border-2 border-[#5b1b28] bg-[#140f13] shadow-[3px_3px_0px_#300d16]",
      topBarClass: "border-b-2 border-[#4a1823] bg-[#1b1419]",
      topBarAccentClass: "border-2 border-[#5b1b28] bg-[#b71c33]",
      topBarControlClass: "border-2 border-[#5b1b28] bg-[#21161c]",
      leftPaneClass:
        "border-r-2 border-[#4a1823] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01)),linear-gradient(90deg,transparent_0,transparent_8px,rgba(183,28,51,0.12)_8px,rgba(183,28,51,0.12)_9px)]",
      leftPaneCardClass: "border-2 border-[#5b1b28] bg-[#21161c]",
      rightMetaClass: "bg-[#b71c33]",
      rightAnswerSelectedClass:
        "rounded-lg border-2 border-[#5b1b28] bg-[#b71c33]",
      rightAnswerIdleClass:
        "rounded-lg border-2 border-[#5b1b28] bg-[#21161c]",
    },
  },
} as const satisfies Record<string, TestingRoomThemePresetDefinition>;

export type TestingRoomTheme = keyof typeof TESTING_ROOM_THEME_PRESETS;
export type TestingRoomThemePreset =
  (typeof TESTING_ROOM_THEME_PRESETS)[TestingRoomTheme];

export const TESTING_ROOM_THEMES = Object.keys(
  TESTING_ROOM_THEME_PRESETS,
) as TestingRoomTheme[];
export const DEFAULT_TESTING_ROOM_THEME: TestingRoomTheme = "ronan";

export function isTestingRoomTheme(
  value: string | null | undefined,
): value is TestingRoomTheme {
  return typeof value === "string" && value in TESTING_ROOM_THEME_PRESETS;
}

export function getTestingRoomThemePreset(
  theme: TestingRoomTheme,
): TestingRoomThemePreset {
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

  const storedTheme = window.localStorage.getItem(
    TESTING_ROOM_THEME_STORAGE_KEY,
  );
  return isTestingRoomTheme(storedTheme)
    ? storedTheme
    : DEFAULT_TESTING_ROOM_THEME;
}

export function persistTestingRoomTheme(theme: TestingRoomTheme) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(TESTING_ROOM_THEME_STORAGE_KEY, theme);
}
