/**
 * Content script: monitora o mouse e detecta a palavra sob o cursor.
 *
 * Quando o mouse fica parado sobre a mesma palavra por `hoverDelayMs`,
 * envia a palavra ao service worker, que traduz e salva.
 *
 * Ao selecionar texto com o mouse:
 *  - uma única palavra → mesmo fluxo do hover (traduz e salva);
 *  - frase/trecho      → apenas traduz e exibe (não salva).
 *
 * Content scripts não suportam ES modules, por isso é um script único (IIFE).
 */
(() => {
  // Mantenha em sincronia com src/shared/languages.js (MessageType) e
  // src/domain/word.js (MAX_TEXT_LENGTH / regra de palavra).
  const MSG_WORD_HOVERED = "WORD_HOVERED";
  const MSG_TRANSLATE_TEXT = "TRANSLATE_TEXT";
  const MAX_TEXT_LENGTH = 1000;
  const SINGLE_WORD = /^[\p{L}][\p{L}\p{M}'’-]*$/u;
  const WORD_CHAR = /[\p{L}\p{M}'’-]/u;
  const IGNORED_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT", "SCRIPT", "STYLE", "CODE", "PRE"]);
  const CONTEXT_RADIUS = 60;

  let settings = { enabled: true, hoverDelayMs: 800, showTooltip: true, targetLang: null };
  let hoverTimer = null;
  let pendingKey = null;   // palavra aguardando o delay
  let capturedKey = null;  // última palavra capturada (evita recapturar sem sair dela)
  let tooltip = null;
  let highlight = null;
  let lastMove = 0;
  let selectionKey = null; // seleção atualmente traduzida (descarta respostas antigas)
  let lastCapture = null;  // { key, word, response } da última palavra capturada

  // ---------- Configurações ----------
  chrome.storage.local.get("settings").then((data) => {
    settings = { ...settings, ...(data.settings ?? {}) };
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.settings) {
      settings = { ...settings, ...(changes.settings.newValue ?? {}) };
      if (!settings.enabled) resetHover();
    }
  });

  // ---------- Detecção da palavra ----------
  /** Retorna {node, offset} do caractere sob o ponto (x, y). */
  function caretFromPoint(x, y) {
    if (document.caretPositionFromPoint) {
      const pos = document.caretPositionFromPoint(x, y);
      return pos ? { node: pos.offsetNode, offset: pos.offset } : null;
    }
    const range = document.caretRangeFromPoint?.(x, y);
    return range ? { node: range.startContainer, offset: range.startOffset } : null;
  }

  function isIgnoredElement(el) {
    for (let cur = el; cur; cur = cur.parentElement) {
      if (IGNORED_TAGS.has(cur.tagName) || cur.isContentEditable) return true;
      if (cur.classList?.contains("ht-tooltip")) return true;
    }
    return false;
  }

  /** Encontra a palavra sob o cursor; retorna null se o cursor não estiver sobre texto. */
  function wordAtPoint(x, y) {
    const caret = caretFromPoint(x, y);
    if (!caret || caret.node?.nodeType !== Node.TEXT_NODE) return null;

    const { node } = caret;
    if (isIgnoredElement(node.parentElement)) return null;

    const text = node.data;
    let start = caret.offset;
    let end = caret.offset;
    while (start > 0 && WORD_CHAR.test(text[start - 1])) start--;
    while (end < text.length && WORD_CHAR.test(text[end])) end++;
    if (end - start < 2) return null;

    const range = document.createRange();
    range.setStart(node, start);
    range.setEnd(node, end);

    // caretFromPoint retorna o caractere mais próximo mesmo em área vazia:
    // confirma que o mouse está realmente dentro do retângulo da palavra.
    const rect = range.getBoundingClientRect();
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return null;

    const word = text.slice(start, end);
    const context = text
      .slice(Math.max(0, start - CONTEXT_RADIUS), Math.min(text.length, end + CONTEXT_RADIUS))
      .replace(/\s+/g, " ")
      .trim();

    return { word, context, rect, key: `${word}|${start}|${rect.top}|${rect.left}` };
  }

  /**
   * URL da página sem query string e fragmento: evita salvar tokens, e-mails
   * ou ids de sessão que alguns sites colocam na URL.
   */
  function safePageUrl() {
    return `${location.origin}${location.pathname}`;
  }

  // ---------- Hover ----------
  function resetHover() {
    clearTimeout(hoverTimer);
    hoverTimer = null;
    pendingKey = null;
  }

  function onMouseMove(e) {
    if (!settings.enabled || !settings.targetLang) return;
    if (e.buttons !== 0 || hasActiveSelection()) return; // selecionando: hover pausado

    // throttle leve (~30fps)
    const now = performance.now();
    if (now - lastMove < 33) return;
    lastMove = now;

    const hit = wordAtPoint(e.clientX, e.clientY);
    if (!hit) {
      resetHover();
      capturedKey = null;
      return;
    }
    if (hit.key === capturedKey || hit.key === pendingKey) return;

    resetHover();
    capturedKey = null;
    pendingKey = hit.key;
    hoverTimer = setTimeout(() => capture(hit), settings.hoverDelayMs);
  }

  /**
   * @param {{word: string, context: string, rect: DOMRect, key: string}} hit
   * @param {{withHighlight?: boolean, isStillValid?: () => boolean}} [options]
   */
  async function capture(hit, { withHighlight = true, isStillValid = () => capturedKey === hit.key } = {}) {
    pendingKey = null;
    capturedKey = hit.key;

    let response;
    try {
      response = await chrome.runtime.sendMessage({
        type: MSG_WORD_HOVERED,
        payload: { text: hit.word, context: hit.context, url: safePageUrl() },
      });
    } catch {
      return; // extensão recarregada/atualizada: ignora
    }

    if (!isStillValid()) return; // mouse saiu da palavra / seleção mudou
    if (!response?.word) return;
    lastCapture = { key: hit.key, word: hit.word.toLowerCase(), response };
    if (settings.showTooltip) showWordTooltip(hit.rect, response, withHighlight);
  }

  // ---------- Seleção ----------
  function hasActiveSelection() {
    const sel = window.getSelection();
    return !!sel && !sel.isCollapsed && sel.toString().trim() !== "";
  }

  /** Trecho ao redor do texto selecionado, para salvar como contexto. */
  function contextAround(el, text) {
    const full = (el?.textContent ?? "").replace(/\s+/g, " ");
    const i = full.indexOf(text);
    if (i < 0) return text;
    return full.slice(Math.max(0, i - CONTEXT_RADIUS), i + text.length + CONTEXT_RADIUS).trim();
  }

  function onMouseUp(e) {
    if (e.button !== 0 || !settings.enabled || !settings.targetLang) return;
    // Aguarda o navegador finalizar a seleção.
    setTimeout(handleSelection, 10);
  }

  async function handleSelection() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;

    const text = sel.toString().replace(/\s+/g, " ").trim();
    if (text.length < 2 || text.length > MAX_TEXT_LENGTH || !/\p{L}/u.test(text)) return;

    // Seleção dentro de campos de formulário/editáveis é ignorada.
    const active = document.activeElement;
    if (active && (IGNORED_TAGS.has(active.tagName) || active.isContentEditable)) return;

    const range = sel.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const el = container.nodeType === Node.ELEMENT_NODE ? container : container.parentElement;
    if (isIgnoredElement(el)) return;

    const rect = range.getBoundingClientRect();
    if (!rect.width && !rect.height) return;

    const key = `sel|${text}|${rect.top}|${rect.left}`;
    if (key === selectionKey) return; // mesma seleção (novo mouseup sem mudança)
    selectionKey = key;
    resetHover();
    const isStillValid = () => selectionKey === key;

    // Palavra única: mesmo fluxo do hover (traduz e salva).
    if (text.length <= 40 && SINGLE_WORD.test(text)) {
      // Já capturada pelo hover agora há pouco: só reexibe, sem contar de novo.
      if (capturedKey && lastCapture?.key === capturedKey && lastCapture.word === text.toLowerCase()) {
        if (settings.showTooltip) showWordTooltip(rect, lastCapture.response, false);
        return;
      }
      await capture({ word: text, context: contextAround(el, text), rect, key }, { withHighlight: false, isStillValid });
      return;
    }

    // Frase/trecho: apenas traduz e exibe.
    let response;
    try {
      response = await chrome.runtime.sendMessage({ type: MSG_TRANSLATE_TEXT, payload: { text } });
    } catch {
      return; // extensão recarregada/atualizada: ignora
    }
    if (!isStillValid()) return;
    if (response?.status === "translated" && settings.showTooltip) showTextTooltip(rect, response.result);
  }

  document.addEventListener("selectionchange", () => {
    if (!hasActiveSelection()) selectionKey = null;
  });

  // ---------- UI ----------
  function ensureUi() {
    if (tooltip) return;
    highlight = document.createElement("div");
    highlight.className = "ht-highlight";
    tooltip = document.createElement("div");
    tooltip.className = "ht-tooltip";
    document.documentElement.append(highlight, tooltip);
  }

  /**
   * Posiciona e exibe o tooltip abaixo (ou acima, se não couber) do retângulo.
   * @param {DOMRect} rect
   * @param {{withHighlight: boolean, durationMs: number}} options
   */
  function placeTooltip(rect, { withHighlight, durationMs }) {
    const sx = window.scrollX;
    const sy = window.scrollY;

    if (withHighlight) {
      Object.assign(highlight.style, {
        left: `${rect.left + sx - 2}px`,
        top: `${rect.top + sy - 1}px`,
        width: `${rect.width + 4}px`,
        height: `${rect.height + 2}px`,
      });
      highlight.classList.add("ht-visible");
    } else {
      highlight.classList.remove("ht-visible");
    }

    // Mede o tooltip já com o conteúdo para mantê-lo dentro da janela.
    const { offsetWidth: w, offsetHeight: h } = tooltip;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - w - 8));
    const fitsBelow = rect.bottom + h + 6 <= window.innerHeight || rect.top - h - 6 < 0;
    const top = fitsBelow ? rect.bottom + 6 : rect.top - h - 6;

    tooltip.style.left = `${left + sx}px`;
    tooltip.style.top = `${top + sy}px`;
    tooltip.classList.add("ht-visible");

    clearTimeout(placeTooltip.hideTimer);
    placeTooltip.hideTimer = setTimeout(hideTooltip, durationMs);
  }

  /** Tooltip de palavra: "palavra → tradução [nova|Nx]". */
  function showWordTooltip(rect, { word, status }, withHighlight = true) {
    ensureUi();
    tooltip.classList.remove("ht-phrase");
    tooltip.replaceChildren();
    const original = document.createElement("span");
    original.className = "ht-original";
    original.textContent = word.text;
    const arrow = document.createElement("span");
    arrow.className = "ht-arrow";
    arrow.textContent = "→";
    const translated = document.createElement("strong");
    translated.textContent = word.translation;
    const badge = document.createElement("span");
    badge.className = "ht-badge";
    badge.textContent = status === "saved" ? "nova" : `${word.count}x`;
    tooltip.append(original, arrow, translated, badge);

    placeTooltip(rect, { withHighlight, durationMs: 2500 });
  }

  /** Tooltip de trecho selecionado: tradução + idiomas. */
  function showTextTooltip(rect, { translation, sourceLang, targetLang }) {
    ensureUi();
    tooltip.classList.add("ht-phrase");
    tooltip.replaceChildren();
    const translated = document.createElement("strong");
    translated.textContent = translation;
    const langs = document.createElement("span");
    langs.className = "ht-lang";
    langs.textContent = `${sourceLang} → ${targetLang}`;
    tooltip.append(translated, langs);

    // Textos maiores ficam mais tempo na tela.
    placeTooltip(rect, { withHighlight: false, durationMs: Math.min(15000, 3000 + translation.length * 50) });
  }

  function hideTooltip() {
    tooltip?.classList.remove("ht-visible");
    highlight?.classList.remove("ht-visible");
  }

  document.addEventListener("mousemove", onMouseMove, { passive: true });
  document.addEventListener("mouseup", onMouseUp, { passive: true });
  document.addEventListener("mousedown", hideTooltip, { passive: true });
  document.addEventListener("scroll", hideTooltip, { passive: true, capture: true });
  document.addEventListener("mouseleave", resetHover);
})();
