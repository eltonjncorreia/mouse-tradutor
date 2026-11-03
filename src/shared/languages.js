/** Idiomas suportados (código ISO usado pelo tradutor → nome exibido). */
export const LANGUAGES = {
  pt: "Português",
  en: "Inglês",
  es: "Espanhol",
  fr: "Francês",
  de: "Alemão",
  it: "Italiano",
  ja: "Japonês",
  ko: "Coreano",
  "zh-CN": "Chinês (simplificado)",
  ru: "Russo",
  ar: "Árabe",
  nl: "Holandês",
};

/** Tipos de mensagens trocadas entre content script, popup e service worker. */
export const MessageType = {
  WORD_HOVERED: "WORD_HOVERED",
  GET_SETTINGS: "GET_SETTINGS",
  TRANSLATE_TEXT: "TRANSLATE_TEXT",
};
