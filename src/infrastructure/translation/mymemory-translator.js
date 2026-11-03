/**
 * Tradutor usando a API gratuita MyMemory (sem chave, ~5000 palavras/dia por IP).
 * Usado como fallback quando o Google falhar ou bloquear.
 */
export class MyMemoryTranslator {
  /**
   * @param {string} text
   * @param {string} targetLang
   * @returns {Promise<import('./translator.js').TranslationResult>}
   */
  async translate(text, targetLang) {
    const url = new URL("https://api.mymemory.translated.net/get");
    url.search = new URLSearchParams({ q: text, langpair: `autodetect|${targetLang}` }).toString();

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Falha na tradução (${res.status})`);

    const data = await res.json();
    if (data.responseStatus !== 200) throw new Error(data.responseDetails || "Falha na tradução");

    const detected = (data.responseData?.detectedLanguage ?? "auto").split("-")[0];
    return { translation: data.responseData.translatedText, sourceLang: detected };
  }
}
