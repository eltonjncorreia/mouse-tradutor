import { buildWordId, createWord, isValidWord } from "../domain/word.js";

/**
 * Caso de uso: captura uma palavra sob o mouse, traduz e salva.
 *
 * - Se a palavra já existir para o idioma alvo, apenas incrementa o contador
 *   (não chama o tradutor de novo).
 * - Se não houver idioma configurado ou a captura estiver desligada, ignora.
 */
export class CaptureWordUseCase {
  /**
   * @param {{
   *   wordRepository: import('../infrastructure/storage/word-repository.js').WordRepository,
   *   settingsRepository: import('../infrastructure/storage/settings-repository.js').SettingsRepository,
   *   translator: { translate(text: string, targetLang: string): Promise<{translation: string, sourceLang: string}> }
   * }} deps
   */
  constructor({ wordRepository, settingsRepository, translator }) {
    this.wordRepository = wordRepository;
    this.settingsRepository = settingsRepository;
    this.translator = translator;
  }

  /**
   * @param {{text: string, context?: string, url?: string}} input
   * @returns {Promise<{status: "saved"|"updated"|"ignored", word?: import('../domain/word.js').SavedWord, reason?: string}>}
   */
  async execute({ text, context = "", url = "" }) {
    const settings = await this.settingsRepository.get();
    if (!settings.enabled) return { status: "ignored", reason: "disabled" };
    if (!settings.targetLang) return { status: "ignored", reason: "no-target-lang" };
    if (!isValidWord(text)) return { status: "ignored", reason: "invalid-word" };

    const id = buildWordId(text, settings.targetLang);
    const existing = await this.wordRepository.findById(id);

    if (existing) {
      const updated = { ...existing, count: existing.count + 1, updatedAt: Date.now() };
      await this.wordRepository.save(updated);
      return { status: "updated", word: updated };
    }

    const { translation, sourceLang } = await this.translator.translate(text, settings.targetLang);

    // Palavra já está no idioma alvo: não faz sentido salvar.
    if (sourceLang === settings.targetLang) {
      return { status: "ignored", reason: "same-language" };
    }

    const word = createWord({ text, translation, sourceLang, targetLang: settings.targetLang, context, url });
    await this.wordRepository.save(word);
    return { status: "saved", word };
  }
}
