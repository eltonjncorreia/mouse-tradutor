# CLAUDE.md — Hover Translator

Extensão Chrome (Manifest V3) que captura palavras ao passar o mouse, traduz e salva.
JavaScript puro (ES modules), **sem build, sem bundler, sem dependências npm**.

## Arquitetura (Clean Architecture)

```
src/domain/          Entidades e regras puras (sem chrome.*, sem fetch)
src/application/     Casos de uso; recebem dependências pelo construtor
src/infrastructure/  Implementações concretas (chrome.storage, APIs de tradução)
  container.js       ÚNICO ponto de composição — trocar implementações só aqui
src/background/      Service worker: roteia mensagens → casos de uso
src/content/         Content script (detecção do hover + tooltip)
src/options/, popup/ UI
src/shared/          Constantes e CSS compartilhados
```

### Regras de dependência
- `domain` não importa nada de outras camadas.
- `application` importa só `domain`; nunca instancia infraestrutura.
- UI e background obtêm dependências de `infrastructure/container.js`, nunca com `new` direto.
- Novo armazenamento → estender `WordRepository` (`findById`, `findAll`, `save`, `remove`, `clear`, todos async).
- Novo tradutor → classe com `translate(text, targetLang): Promise<{translation, sourceLang}>`
  e registrar no `FallbackTranslator` em `container.js`.

## Restrições do Chrome / MV3
- **`src/content/content.js` não suporta `import`**: é um script único (IIFE). Constantes
  compartilhadas (ex.: tipos de mensagem) precisam ser duplicadas ali — mantenha em sincronia
  com `src/shared/languages.js`.
- O service worker é efêmero: não guarde estado em memória que precise persistir.
- Escritas de palavras passam pela fila serial do service worker para evitar condição de corrida
  no read-modify-write do `chrome.storage.local`.
- Todo domínio novo acessado via `fetch` precisa estar em `host_permissions` no `manifest.json`.
- Persistência sempre em `chrome.storage.local`, nunca `localStorage` da página.

## Convenções de código
- JSDoc com tipos em funções e classes públicas (`@param`, `@returns`, `@typedef`).
- Imports ordenados: externos → camadas internas; sempre com extensão `.js`.
- Textos de UI e comentários em português; identificadores em inglês.
- Nunca usar `innerHTML` com dados de páginas/traduções: usar `textContent`/`createElement`.
- CSS injetado em páginas usa prefixo `ht-` para não colidir com o site.

## Verificação
```bash
for f in $(find src -name '*.js'); do node --check "$f"; done
node -e "JSON.parse(require('fs').readFileSync('manifest.json'))"
```
Casos de uso podem ser testados no Node com repositórios falsos (sem `chrome.*`).
Teste manual: `chrome://extensions` → Recarregar a extensão → recarregar a aba.
