import { CaptureWordUseCase } from "../application/capture-word.js";
import { TranslateTextUseCase } from "../application/translate-text.js";
import { settingsRepository, translator, wordRepository } from "../infrastructure/container.js";
import { MessageType } from "../shared/languages.js";

const captureWord = new CaptureWordUseCase({ wordRepository, settingsRepository, translator });
const translateText = new TranslateTextUseCase({ settingsRepository, translator });

// Cadastro inicial: ao instalar, abre a tela para escolher o idioma.
chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason !== chrome.runtime.OnInstalledReason.INSTALL) return;
  chrome.tabs.create({ url: chrome.runtime.getURL("src/options/options.html?onboarding=1") });
});

// Fila serial: evita condição de corrida no read-modify-write do storage
// quando várias palavras chegam em sequência.
let queue = Promise.resolve();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Aceita apenas mensagens da própria extensão (defesa em profundidade).
  if (sender.id !== chrome.runtime.id) return false;

  if (message?.type === MessageType.WORD_HOVERED) {
    queue = queue
      .then(() => captureWord.execute(message.payload))
      .then(sendResponse)
      .catch((err) => sendResponse({ status: "error", reason: String(err?.message ?? err) }));
    return true; // resposta assíncrona
  }

  // Tradução de seleção não grava no storage: não precisa passar pela fila.
  if (message?.type === MessageType.TRANSLATE_TEXT) {
    translateText
      .execute(message.payload)
      .then(sendResponse)
      .catch((err) => sendResponse({ status: "error", reason: String(err?.message ?? err) }));
    return true;
  }

  if (message?.type === MessageType.GET_SETTINGS) {
    settingsRepository.get().then(sendResponse);
    return true;
  }

  return false;
});
