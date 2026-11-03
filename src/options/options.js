import { settingsRepository, wordRepository } from "../infrastructure/container.js";
import { LANGUAGES } from "../shared/languages.js";

const $ = (id) => document.getElementById(id);
const form = $("settings-form");
const langSelect = $("targetLang");
const delayInput = $("hoverDelayMs");

/** Preenche o select de idiomas. */
function renderLanguages() {
  for (const [code, name] of Object.entries(LANGUAGES)) {
    langSelect.append(new Option(name, code));
  }
}

async function loadSettings() {
  const s = await settingsRepository.get();
  if (s.targetLang) langSelect.value = s.targetLang;
  delayInput.value = s.hoverDelayMs;
  $("delay-value").textContent = s.hoverDelayMs;
  $("enabled").checked = s.enabled;
  $("showTooltip").checked = s.showTooltip;

  const isOnboarding = new URLSearchParams(location.search).has("onboarding") || !s.targetLang;
  $("onboarding").hidden = !isOnboarding;
}

delayInput.addEventListener("input", () => {
  $("delay-value").textContent = delayInput.value;
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  await settingsRepository.update({
    targetLang: langSelect.value,
    hoverDelayMs: Number(delayInput.value),
    enabled: $("enabled").checked,
    showTooltip: $("showTooltip").checked,
  });
  $("onboarding").hidden = true;
  $("saved-msg").hidden = false;
  setTimeout(() => ($("saved-msg").hidden = true), 2000);
});

/** Renderiza a tabela de palavras, aplicando o filtro de busca. */
async function renderWords() {
  const query = $("search").value.trim().toLowerCase();
  const all = await wordRepository.findAll();
  const words = query
    ? all.filter((w) => w.text.includes(query) || w.translation.toLowerCase().includes(query))
    : all;

  $("word-count").textContent = all.length;
  $("empty").hidden = words.length > 0;

  const tbody = $("words");
  tbody.replaceChildren(
    ...words.map((w) => {
      const tr = document.createElement("tr");
      const cells = [
        w.text,
        w.translation,
        String(w.count),
        w.context,
        new Date(w.updatedAt).toLocaleString(),
      ];
      for (const value of cells) {
        const td = document.createElement("td");
        td.textContent = value;
        tr.append(td);
      }
      tr.children[1].className = "translation";
      tr.children[3].className = "context";
      if (w.url) tr.children[3].title = w.url;

      const del = document.createElement("button");
      del.textContent = "✕";
      del.title = "Remover";
      del.className = "icon";
      del.addEventListener("click", async () => {
        await wordRepository.remove(w.id);
      });
      const td = document.createElement("td");
      td.append(del);
      tr.append(td);
      return tr;
    }),
  );
}

$("search").addEventListener("input", renderWords);

$("export").addEventListener("click", async () => {
  const words = await wordRepository.findAll();
  const blob = new Blob([JSON.stringify(words, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `hover-translator-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});

$("clear").addEventListener("click", async () => {
  if (confirm("Apagar todas as palavras salvas? Essa ação não pode ser desfeita.")) {
    await wordRepository.clear();
  }
});

// Atualiza a lista em tempo real quando novas palavras são capturadas.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.words) renderWords();
});

renderLanguages();
loadSettings();
renderWords();
