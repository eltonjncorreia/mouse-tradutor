import { WordRepository } from "./word-repository.js";

/**
 * Implementação futura: persiste as palavras numa API REST.
 *
 * Para ativar, troque o repositório em `src/infrastructure/container.js`
 * e adicione o domínio da API em "host_permissions" no manifest.json.
 *
 * Endpoints esperados:
 *   GET    {baseUrl}/words
 *   GET    {baseUrl}/words/:id
 *   PUT    {baseUrl}/words/:id
 *   DELETE {baseUrl}/words/:id
 *   DELETE {baseUrl}/words
 */
export class ApiWordRepository extends WordRepository {
  /** @param {{baseUrl: string, token?: string}} config */
  constructor({ baseUrl, token }) {
    super();
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.token = token;
  }

  /** @param {string} path @param {RequestInit} [init] */
  async #request(path, init = {}) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        ...init.headers,
      },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
    return res.status === 204 ? null : res.json();
  }

  async findById(id) {
    return this.#request(`/words/${encodeURIComponent(id)}`);
  }

  async findAll() {
    return (await this.#request("/words")) ?? [];
  }

  async save(word) {
    await this.#request(`/words/${encodeURIComponent(word.id)}`, {
      method: "PUT",
      body: JSON.stringify(word),
    });
  }

  async remove(id) {
    await this.#request(`/words/${encodeURIComponent(id)}`, { method: "DELETE" });
  }

  async clear() {
    await this.#request("/words", { method: "DELETE" });
  }
}
