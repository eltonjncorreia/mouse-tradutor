import { ChromeStorageWordRepository } from "./storage/chrome-storage-word-repository.js";
// import { ApiWordRepository } from "./storage/api-word-repository.js";
import { SettingsRepository } from "./storage/settings-repository.js";
import { FallbackTranslator } from "./translation/fallback-translator.js";
import { GoogleTranslator } from "./translation/google-translator.js";
import { MyMemoryTranslator } from "./translation/mymemory-translator.js";

/**
 * Composição de dependências. Este é o ÚNICO lugar que precisa mudar para
 * trocar o armazenamento local por uma API/banco de dados, por exemplo:
 *
 *   export const wordRepository = new ApiWordRepository({ baseUrl: "https://minha-api.com" });
 */
export const wordRepository = new ChromeStorageWordRepository();
export const settingsRepository = new SettingsRepository();
export const translator = new FallbackTranslator([new GoogleTranslator(), new MyMemoryTranslator()]);
