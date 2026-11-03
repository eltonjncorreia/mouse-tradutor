/**
 * @typedef {Object} Settings
 * @property {string|null} targetLang   Idioma para o qual traduzir (definido no cadastro)
 * @property {boolean} enabled          Captura ligada/desligada
 * @property {number} hoverDelayMs      Tempo parado sobre a palavra até salvar
 * @property {boolean} showTooltip      Exibir tooltip com a tradução na página
 */

/** @type {Settings} */
export const DEFAULT_SETTINGS = {
  targetLang: null,
  enabled: true,
  hoverDelayMs: 800,
  showTooltip: true,
};

const KEY = "settings";

/** Repositório de configurações (chrome.storage.local). */
export class SettingsRepository {
  /** @returns {Promise<Settings>} */
  async get() {
    const data = await chrome.storage.local.get(KEY);
    return { ...DEFAULT_SETTINGS, ...(data[KEY] ?? {}) };
  }

  /** @param {Partial<Settings>} patch @returns {Promise<Settings>} */
  async update(patch) {
    const next = { ...(await this.get()), ...patch };
    await chrome.storage.local.set({ [KEY]: next });
    return next;
  }
}
