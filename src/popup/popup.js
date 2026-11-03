import { settingsRepository, wordRepository } from "../infrastructure/container.js";
import { LANGUAGES } from "../shared/languages.js";

const $ = (id) => document.getElementById(id);
const RECENT_LIMIT = 8;

async function render() {
  const [settings, words] = await Promise.all([settingsRepository.get(), wordRepository.findAll()]);

  $("enabled").checked = settings.enabled;
  $("no-lang").hidden = Boolean(settings.targetLang);
  $("lang-info").hidden = !settings.targetLang;
  $("lang-name").textContent = LANGUAGES[settings.targetLang] ?? settings.targetLang ?? "";
  $("total").textContent = words.length;
  $("empty").hidden = words.length > 0;

  $("recent").replaceChildren(
    ...words.slice(0, RECENT_LIMIT).map((w) => {
      const li = document.createElement("li");
      const original = document.createElement("span");
      original.textContent = w.text;
      const translation = document.createElement("strong");
      translation.textContent = w.translation;
      li.append(original, translation);
      return li;
    }),
  );
}

$("enabled").addEventListener("change", (e) => settingsRepository.update({ enabled: e.target.checked }));
$("open-options").addEventListener("click", () => chrome.runtime.openOptionsPage());
$("setup").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

render();
