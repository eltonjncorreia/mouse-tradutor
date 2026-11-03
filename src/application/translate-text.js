import { isTranslatableText, normalizeText } from "../domain/word.js";

/**
 * @typedef {Object} TextTranslation
 * @property {string} text         Texto original (normalizado)
 * @property {string} translation  Tradução para o idioma alvo
 * @property {string} sourceLang   Idioma de origem detectado
 * @property {string} targetLang   Idioma alvo
 */

/**
 * Caso de uso: traduz um trecho de texto selecionado, sem salvar.
 *
 * Frases e parágrafos não entram na lista de palavras; apenas palavras
 * isoladas são salvas (via CaptureWordUseCase).
 */
export class TranslateTextUseCase {
  /**
   * @param {{
   *   settingsRepository: import('../infrastructure/storage/settings-repository.js').SettingsRepository,
   *   translator: { translate(text: string, targetLang: string): Promise<{translation: string, sourceLang: string}> }
   * }} deps
   */
  constructor({ settingsRepository, translator }) {
    this.settingsRepository = settingsRepository;
    this.translator = translator;
  }

  /**
   * @param {{text: string}} input
   * @returns {Promise<{status: "translated"|"ignored", result?: TextTranslation, reason?: string}>}
   */
  async execute({ text }) {
    const settings = await this.settingsRepository.get();
    if (!settings.enabled) return { status: "ignored", reason: "disabled" };
    if (!settings.targetLang) return { status: "ignored", reason: "no-target-lang" };
    if (!isTranslatableText(text)) return { status: "ignored", reason: "invalid-text" };

    const normalized = normalizeText(text);
    const { translation, sourceLang } = await this.translator.translate(normalized, settings.targetLang);

    if (sourceLang === settings.targetLang) return { status: "ignored", reason: "same-language" };

    return {
      status: "translated",
      result: { text: normalized, translation, sourceLang, targetLang: settings.targetLang },
    };
  }
}
