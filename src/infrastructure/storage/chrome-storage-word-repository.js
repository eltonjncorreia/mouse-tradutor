import { WordRepository } from "./word-repository.js";

const KEY = "words";

/**
 * Implementação usando chrome.storage.local.
 *
 * Diferente do localStorage das páginas, o chrome.storage.local é persistente:
 * não é apagado ao limpar dados de sites e sobrevive a reinícios do navegador.
 * Só é removido ao desinstalar a extensão. Com a permissão "unlimitedStorage"
 * não há limite de 10 MB.
 */
export class ChromeStorageWordRepository extends WordRepository {
  /** @returns {Promise<Record<string, any>>} */
  async #readAll() {
    const data = await chrome.storage.local.get(KEY);
    return data[KEY] ?? {};
  }

  /** @param {Record<string, any>} words */
  async #writeAll(words) {
    await chrome.storage.local.set({ [KEY]: words });
  }

  async findById(id) {
    const words = await this.#readAll();
    return words[id] ?? null;
  }

  async findAll() {
    const words = await this.#readAll();
    return Object.values(words).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async save(word) {
    const words = await this.#readAll();
    words[word.id] = word;
    await this.#writeAll(words);
  }

  async remove(id) {
    const words = await this.#readAll();
    delete words[id];
    await this.#writeAll(words);
  }

  async clear() {
    await chrome.storage.local.remove(KEY);
  }
}
