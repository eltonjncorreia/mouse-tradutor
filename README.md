# Hover Translator (extensão para Chrome)

Passe o mouse sobre uma palavra em qualquer página: depois de um breve tempo parado sobre ela,
a palavra é **traduzida** para o idioma escolhido no cadastro e **salva permanentemente**.

## Instalação no Chrome

Requisitos: Google Chrome (ou Edge, Brave, Opera — qualquer navegador baseado em Chromium)
no computador. Extensões não funcionam no Chrome para celular.

### 1. Baixar a extensão

- **Com Git:**
  ```bash
  git clone <URL-do-repositório> hover-translator
  ```
- **Sem Git:** baixe o `.zip` do repositório (botão **Code → Download ZIP** no GitHub)
  e extraia. Guarde a pasta num local fixo (ex.: `Documentos/hover-translator`):
  o Chrome carrega a extensão **direto dessa pasta**; se ela for apagada ou movida,
  a extensão para de funcionar.

### 2. Carregar no Chrome

1. Abra uma nova aba e acesse `chrome://extensions`
2. Ative **Modo do desenvolvedor** (chave no canto superior direito)
3. Clique em **Carregar sem compactação**
4. Selecione a pasta que contém o arquivo `manifest.json` (a raiz do projeto,
   não a pasta `src`)
5. O **Hover Translator** aparece na lista. Ele abre sozinho a tela de boas-vindas:
   escolha o idioma de tradução e clique em **Salvar**

### 3. Fixar o ícone (opcional)

Clique no ícone de quebra-cabeça 🧩 na barra do Chrome e no alfinete 📌 ao lado do
**Hover Translator**. Pelo ícone você liga/desliga a captura e vê as palavras recentes.

### 4. Usar

- **Passe o mouse** sobre uma palavra e espere ~0,8 s: ela é traduzida e salva.
- **Selecione** um trecho com o mouse: a tradução aparece logo abaixo.
- **Recarregue as abas** que já estavam abertas antes da instalação (F5), senão a
  extensão ainda não estará ativa nelas.
- Não funciona em páginas internas do Chrome (`chrome://…`) nem na Chrome Web Store.

### Atualizar

Baixe a nova versão (`git pull` ou novo `.zip` extraído **na mesma pasta**), vá em
`chrome://extensions` e clique em **↻ Recarregar** no card do Hover Translator.
Depois recarregue as abas abertas. As palavras salvas são mantidas.

### Desinstalar

Em `chrome://extensions`, clique em **Remover**. ⚠️ Isso apaga todas as palavras salvas —
use antes **Exportar JSON** na página de configurações se quiser guardar um backup.

### Problemas comuns

| Sintoma | Solução |
|---|---|
| "Manifesto ausente ou ilegível" | Você selecionou a pasta errada: escolha a que contém `manifest.json`. |
| Nada acontece ao passar o mouse | Recarregue a aba; confira se a captura está ativada no ícone e se há idioma escolhido. |
| Tradução não aparece | Os serviços gratuitos podem limitar requisições; aguarde alguns minutos. Veja erros em `chrome://extensions` → **Erros** / **service worker**. |
| Aviso "Desative extensões no modo desenvolvedor" | Normal para extensões fora da Chrome Web Store; clique em fechar. |

### Publicar na Chrome Web Store (para qualquer pessoa instalar com 1 clique)

1. Aumente `"version"` no `manifest.json`.
2. Gere o pacote (o `manifest.json` precisa ficar na raiz do zip):
   ```bash
   zip -r hover-translator.zip manifest.json src icons
   ```
3. Envie em https://chrome.google.com/webstore/devconsole (taxa única de US$ 5 para criar a conta
   de desenvolvedor), preencha a listagem, as justificativas de permissão e a política de privacidade.

> **Não** use "Compactar extensão" do Chrome para distribuir: ele gera um `.crx` (que o Chrome
> bloqueia fora da loja) e um arquivo **`.pem`, que é a chave privada da extensão** — nunca
> compartilhe nem versione esse arquivo (já está no `.gitignore`).

## Privacidade e segurança

- **Sem chaves ou segredos:** a extensão usa apenas serviços gratuitos sem autenticação.
  Se no futuro usar `ApiWordRepository` com `token`, não coloque o token no código —
  peça ao usuário nas configurações ou use um backend próprio.
- **Dados enviados a terceiros:** as palavras sob o mouse e os trechos selecionados são enviados
  (via HTTPS) ao Google Tradutor e/ou MyMemory para tradução. Evite selecionar dados sensíveis
  (senhas, documentos, dados bancários). Desligue a captura pelo ícone quando quiser.
- **Dados locais:** palavras, contexto e página de origem ficam só em `chrome.storage.local`.
  A URL salva é apenas `origem + caminho` (sem `?query` e `#fragmento`, que podem conter tokens).
- Campos de formulário, senhas e áreas editáveis são ignorados.
- O service worker só aceita mensagens da própria extensão, e nenhum texto vindo de páginas ou
  traduções é inserido como HTML (`textContent` apenas).

## Como funciona

- O content script detecta a palavra sob o cursor (`caretPositionFromPoint`) e espera
  `hoverDelayMs` (padrão 800 ms) com o mouse parado sobre ela.
- O service worker executa o caso de uso `CaptureWordUseCase`:
  - palavra nova → traduz e salva
  - palavra já salva → apenas incrementa o contador (não traduz de novo)
  - palavra já no idioma alvo → ignorada
- Um tooltip mostra `palavra → tradução` na página.
- **Seleção de texto** (arrastar o mouse ou duplo clique):
  - uma única palavra → mesmo fluxo do hover (traduz e salva);
  - frase/trecho (até 1000 caracteres) → `TranslateTextUseCase` traduz e exibe, **sem salvar**.
- Campos de texto, `code`/`pre` e áreas editáveis são ignorados.

## Armazenamento

Usa `chrome.storage.local` (+ permissão `unlimitedStorage`): ao contrário do `localStorage`
das páginas, é persistente, não some ao limpar dados de sites e não tem limite de tamanho.
Só é apagado ao desinstalar a extensão — use **Exportar JSON** na página de configurações
para fazer backup.

### Trocando para API / banco de dados

O armazenamento segue o contrato `WordRepository`
(`src/infrastructure/storage/word-repository.js`). Já existe um esboço `ApiWordRepository`.
Para usar, altere **apenas** `src/infrastructure/container.js`:

```js
export const wordRepository = new ApiWordRepository({ baseUrl: "https://minha-api.com", token: "..." });
```

e adicione o domínio em `host_permissions` no `manifest.json`.

## Tradução

`FallbackTranslator` usa apenas serviços **gratuitos e sem chave**: tenta o endpoint público
do Google Translate e, se falhar/bloquear, usa a API MyMemory (~5000 palavras/dia por IP). Para outro serviço, crie uma classe com `translate(text, targetLang)`
e registre em `container.js`.

## Estrutura

```
manifest.json
src/
├── domain/word.js                     # Entidade + regras (normalização, validação)
├── application/capture-word.js        # Caso de uso: capturar → traduzir → salvar
├── infrastructure/
│   ├── container.js                   # Injeção de dependências (troque implementações aqui)
│   ├── storage/                       # WordRepository, chrome.storage, API, settings
│   └── translation/                   # Google (público), MyMemory, fallback
├── background/service-worker.js       # Recebe mensagens e executa o caso de uso
├── content/                           # Detecção do hover + tooltip
├── options/                           # Cadastro (idioma) + lista de palavras
├── popup/                             # Ativar/desativar + palavras recentes
└── shared/                            # Idiomas, tipos de mensagem, CSS comum
```
