/**
 * @typedef {Object} TranslationResult
 * @property {string} translation
 * @property {string} sourceLang
 */

/**
 * Contrato de um tradutor. Qualquer serviço (Google Cloud, DeepL, API própria)
 * deve expor `translate(text, targetLang)` e ser registrado em
 * `src/infrastructure/container.js`.
 *
 * @typedef {{ translate(text: string, targetLang: string): Promise<TranslationResult> }} Translator
 */

export {};
