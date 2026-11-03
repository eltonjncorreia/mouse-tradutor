/**
 * Tradutor usando o endpoint público do Google Translate (gratuito, sem chave de API).
 *
 * Observação: não é uma API oficial documentada; pode sofrer limite de requisições.
 * Nesse caso o FallbackTranslator recorre ao MyMemory.
 */
export class GoogleTranslator {
  /**
   * @param {string} text
   * @param {string} targetLang
   * @returns {Promise<import('./translator.js').TranslationResult>}
   */
  async translate(text, targetLang) {
    const url = new URL("https://translate.googleapis.com/translate_a/single");
    url.search = new URLSearchParams({
      client: "gtx",
      sl: "auto",
      tl: targetLang,
      dt: "t",
      q: text,
    }).toString();

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Falha na tradução (${res.status})`);

    const data = await res.json();
    const translation = (data?.[0] ?? []).map((part) => part?.[0] ?? "").join("");
    return { translation, sourceLang: data?.[2] ?? "auto" };
  }
}
