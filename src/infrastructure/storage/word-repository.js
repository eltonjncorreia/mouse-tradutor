/**
 * Contrato (porta) do repositório de palavras.
 *
 * Qualquer implementação (chrome.storage, IndexedDB, API REST, banco de dados)
 * deve implementar estes métodos. Os métodos são todos assíncronos, então
 * trocar para uma API remota não exige mudar quem consome o repositório.
 *
 * @interface
 */
export class WordRepository {
  /** @param {string} id @returns {Promise<import('../../domain/word.js').SavedWord|null>} */
  async findById(id) { throw new Error("not implemented"); }

  /** @returns {Promise<import('../../domain/word.js').SavedWord[]>} */
  async findAll() { throw new Error("not implemented"); }

  /** @param {import('../../domain/word.js').SavedWord} word @returns {Promise<void>} */
  async save(word) { throw new Error("not implemented"); }

  /** @param {string} id @returns {Promise<void>} */
  async remove(id) { throw new Error("not implemented"); }

  /** @returns {Promise<void>} */
  async clear() { throw new Error("not implemented"); }
}
