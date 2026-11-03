/**
 * Entidade de domínio: uma palavra salva pelo usuário.
 *
 * @typedef {Object} SavedWord
 * @property {string} id              Chave única (palavra normalizada + idioma alvo)
 * @property {string} text            Palavra como apareceu na página
 * @property {string} translation     Tradução para o idioma alvo
 * @property {string} sourceLang      Idioma de origem detectado
 * @property {string} targetLang      Idioma alvo
 * @property {string} context         Trecho da frase onde a palavra apareceu
 * @property {string} url             Página onde foi encontrada
 * @property {number} count           Quantas vezes foi capturada
 * @property {number} createdAt       Timestamp da primeira captura
 * @property {number} updatedAt       Timestamp da última captura
 */

const WORD_REGEX = /^[\p{L}][\p{L}\p{M}'’-]*$/u;

/**
 * Normaliza uma palavra para comparação/armazenamento.
 * @param {string} text
 * @returns {string}
 */
export function normalizeWord(text) {
  return text.trim().replace(/^['’-]+|['’-]+$/g, "").toLowerCase();
}

/**
 * Verifica se o texto é uma palavra válida para salvar.
 * @param {string} text
 * @returns {boolean}
 */
export function isValidWord(text) {
  const normalized = normalizeWord(text);
  return normalized.length >= 2 && normalized.length <= 40 && WORD_REGEX.test(normalized);
}

/**
 * Gera o id único de uma palavra para um idioma alvo.
 * @param {string} text
 * @param {string} targetLang
 * @returns {string}
 */
export function buildWordId(text, targetLang) {
  return `${normalizeWord(text)}::${targetLang}`;
}

/**
 * Cria uma nova entidade SavedWord.
 * @param {{text: string, translation: string, sourceLang: string, targetLang: string, context?: string, url?: string}} data
 * @returns {SavedWord}
 */
export function createWord({ text, translation, sourceLang, targetLang, context = "", url = "" }) {
  const now = Date.now();
  return {
    id: buildWordId(text, targetLang),
    text: normalizeWord(text),
    translation,
    sourceLang,
    targetLang,
    context,
    url,
    count: 1,
    createdAt: now,
    updatedAt: now,
  };
}

/** Tamanho máximo de um texto selecionado para tradução. */
export const MAX_TEXT_LENGTH = 1000;

/**
 * Normaliza um texto livre (seleção): colapsa espaços e quebras de linha.
 * @param {string} text
 * @returns {string}
 */
export function normalizeText(text) {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Verifica se um texto selecionado pode ser traduzido: tem ao menos uma letra
 * e não excede MAX_TEXT_LENGTH.
 * @param {string} text
 * @returns {boolean}
 */
export function isTranslatableText(text) {
  const normalized = normalizeText(text);
  return normalized.length >= 2 && normalized.length <= MAX_TEXT_LENGTH && /\p{L}/u.test(normalized);
}
