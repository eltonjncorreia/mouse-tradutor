/**
 * Encadeia tradutores: tenta cada um em ordem até algum funcionar.
 */
export class FallbackTranslator {
  /** @param {import('./translator.js').Translator[]} translators */
  constructor(translators) {
    this.translators = translators;
  }

  /**
   * @param {string} text
   * @param {string} targetLang
   * @returns {Promise<import('./translator.js').TranslationResult>}
   */
  async translate(text, targetLang) {
    let lastError;
    for (const translator of this.translators) {
      try {
        const result = await translator.translate(text, targetLang);
        if (result.translation) return result;
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError ?? new Error("Nenhum tradutor disponível");
  }
}
