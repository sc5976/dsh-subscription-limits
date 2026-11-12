# dsh-subscription-limits

**English** | [Русский](#русский)

Subscription quota and balance monitor for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). A small chip in the composer shows how much of your subscription limits is used; hover it — or click to pin — to see the 5-hour, weekly and monthly windows, reset times and prepaid balances. By default the chip and card are scoped to the provider that serves the session's current model; the **All** switch next to the language selector widens them to every tracked provider.

## What it is

- **Quotas** — OpenCode Go, MiniMax, GLM Coding Plan (Z.AI / BigModel), Kimi For Coding.
- **Balances** — OpenRouter, DeepSeek, Moonshot.
- **Scoped by default** — only the current model's provider is shown; the **All** toggle (remembered per browser) lists every provider.
- **Frontier models** — supported only through those plans (e.g. Claude models inside OpenCode Go). First-party ChatGPT, Claude, Gemini, Copilot and Cursor subscriptions are not tracked: none of them publishes a usage API for an individual subscriber. Their own clients read private endpoints (ChatGPT's `/backend-api/wham/usage`, Claude's `/api/oauth/usage`) that this plugin deliberately does not call.
- **Nine UI languages** — English (default), Russian, Chinese, French, Spanish, German, Portuguese, Japanese, Korean; switch in the card, the choice is remembered.
- **No extra settings tab** — a compact chip near the input plus a hover/pinned card.
- Keys are read host-side only; the browser receives percentages and amounts, never secrets.

## Install

The source below carries no version, so it resolves to the latest commit on `main` every time it is installed.

**DSH Desktop** — Settings → Plugins → install by package source:

```
github:sc5976/dsh-subscription-limits
```

Then refresh the page (F5).

**CLI profile**

```bash
dsh plugin --profile <profile> add "github:sc5976/dsh-subscription-limits"
```

Add the package name to the profile's `dsh.profile.bundles` if the plugin manager did not.

Pin a release when a frozen install matters — append the tag: `github:sc5976/dsh-subscription-limits#v1.3.0`.

## Updates

A GitHub source is a pnpm git dependency: pnpm records the exact commit it resolved in the profile's `pnpm-lock.yaml`, so an installed copy never changes on its own.

- **DSH Desktop** — Settings → Plugins → the plugin's page: the **Versions** section offers a newer release when the repository has one; installing it is an update. Installing the same source again does the same. A replaced dependency needs a DSH restart; the web page only needs a refresh.
- **CLI** — re-resolve the source, then restart DSH:

```bash
dsh plugin --profile <profile> add "github:sc5976/dsh-subscription-limits"
# or: dsh plugin --profile <profile> update @local/dsh-subscription-limits
```

- **Pinned installs** (`#v1.2.0`) stay on that tag until the source is re-added — without a tag, or with the tag of the release you want.

Every release bumps `package.json` and is tagged (`v1.3.0`, `v1.2.1`, …), so both forms have a defined target: no tag means the newest commit on `main`, a tag means that release permanently.

Provider keys come from the profile's credential store and are referenced by their usual names (`OPENCODE_GO_API_KEY`, `MINIMAX_API_KEY`, `ZAI_API_KEY`, `KIMI_API_KEY`, `OPENROUTER_API_KEY`, `DEEPSEEK_API_KEY`, `MOONSHOT_API_KEY`, ...); keys discovered through `llm-pi-ai` provider profiles work as well.

## Compatibility

- DSH **>= 0.2.2-rc.1**, web GUI surface (Desktop or `dsh web`).
- Plain JavaScript, no build step, no runtime dependencies.

## Extending

Add or override providers through the row's `config`:

```yaml
- id: subscription-limits
  name: '@local/dsh-subscription-limits'
  config:
    hide: [moonshot-cn]
    providers:
      - id: my-gateway
        name: My gateway
        kind: plan
        parser: opencode-go        # built-in: opencode-go | minimax | glm | kimi | openrouter | deepseek | moonshot
        url: https://gateway.example/v1/usage
        env: MY_GATEWAY_KEY
        auth: bearer               # bearer | raw
```

A new response format is one parser function in `index.js` returning `{ windows: [{ key: '5h' | 'week' | 'month', percent, resetsAt }] }` or `{ balance: { amount, currency } }`.

UI copy is the `STRINGS` table in `client.js`; a new language is one block there plus a matching `locale/<code>.json` for the plugin card.

## Development

```bash
node test-client.mjs      # widget renders in all nine languages, registers in the composer dock, scopes to the current model
node test-adapters.mjs    # provider response parsers
```

## License

MIT — see [LICENSE](LICENSE).

---

<a id="русский"></a>
# dsh-subscription-limits

Монитор квот и балансов подписок для [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). Компактный чип у поля ввода показывает, сколько израсходовано от лимитов подписки; при наведении (или клике — чтобы закрепить) раскрывается карточка с окнами 5 часов / неделя / месяц, временем сброса и балансами. По умолчанию чип и карточка показывают только провайдера текущей модели сессии; переключатель **Все** рядом с выбором языка расширяет список до всех отслеживаемых провайдеров.

## Что это

- **Квоты** — OpenCode Go, MiniMax, GLM Coding Plan (Z.AI / BigModel), Kimi For Coding.
- **Балансы** — OpenRouter, DeepSeek, Moonshot.
- **Фильтр по текущей модели** — по умолчанию виден только провайдер текущей модели; переключатель **Все** (запоминается в браузере) показывает всех провайдеров.
- **Передовые модели** — только через эти планы (например, модели Claude внутри OpenCode Go). Официальные подписки ChatGPT, Claude, Gemini, Copilot и Cursor не отслеживаются: ни одна из них не публикует API учёта использования для отдельного подписчика. Их собственные клиенты обращаются к приватным эндпоинтам (у ChatGPT — `/backend-api/wham/usage`, у Claude — `/api/oauth/usage`), которые этот плагин намеренно не вызывает.
- **Девять языков интерфейса** — английский (по умолчанию), русский, китайский, французский, испанский, немецкий, португальский, японский, корейский; переключатель в карточке, выбор запоминается.
- **Без отдельной вкладки настроек** — чип рядом с полем ввода и карточка по наведению/закреплению.
- Ключи читаются только на стороне хоста; в браузер уходят проценты и суммы, но не секреты.

## Установка

Источник ниже указан без версии, поэтому при каждой установке берётся последний коммит ветки `main`.

**DSH Desktop** — Настройки → Плагины → установить по источнику:

```
github:sc5976/dsh-subscription-limits
```

Затем обновите страницу (F5).

**CLI-профиль**

```bash
dsh plugin --profile <profile> add "github:sc5976/dsh-subscription-limits"
```

Имя пакета добавьте в `dsh.profile.bundles` профиля, если менеджер плагинов не сделал это сам.

Нужна «замороженная» установка — добавьте тег: `github:sc5976/dsh-subscription-limits#v1.3.0`.

## Обновление

Источник с GitHub — это git-зависимость pnpm: точный коммит записывается в `pnpm-lock.yaml` профиля, поэтому сама по себе установленная копия не меняется.

- **DSH Desktop** — Настройки → Плагины → страница плагина: раздел **Версии** предлагает более новый релиз, когда он появился в репозитории; его установка и есть обновление. Повторная установка того же источника даёт то же самое. Заменённая зависимость требует перезапуска DSH; веб-странице достаточно обновления (F5).
- **CLI** — переразрешите источник и перезапустите DSH:

```bash
dsh plugin --profile <profile> add "github:sc5976/dsh-subscription-limits"
# или: dsh plugin --profile <profile> update @local/dsh-subscription-limits
```

- **Установки с тегом** (`#v1.2.0`) остаются на этом теге, пока источник не добавят заново — без тега или с тегом нужного релиза.

Каждый релиз поднимает версию в `package.json` и получает тег (`v1.3.0`, `v1.2.1`, …), поэтому у обеих форм есть определённая цель: без тега — самый свежий коммит в `main`, с тегом — именно этот релиз.

Ключи провайдеров берутся из credential-хранилища профиля по обычным именам (`OPENCODE_GO_API_KEY`, `MINIMAX_API_KEY`, `ZAI_API_KEY`, `KIMI_API_KEY`, `OPENROUTER_API_KEY`, `DEEPSEEK_API_KEY`, `MOONSHOT_API_KEY`, ...); ключи из профилей `llm-pi-ai` тоже находятся.

## Совместимость

- DSH **>= 0.2.2-rc.1**, web-поверхность (Desktop или `dsh web`).
- Чистый JavaScript, без сборки и зависимостей.

## Расширение

Провайдеры добавляются или переопределяются через `config` строки плагина:

```yaml
- id: subscription-limits
  name: '@local/dsh-subscription-limits'
  config:
    hide: [moonshot-cn]
    providers:
      - id: my-gateway
        name: My gateway
        kind: plan
        parser: opencode-go        # встроенные: opencode-go | minimax | glm | kimi | openrouter | deepseek | moonshot
        url: https://gateway.example/v1/usage
        env: MY_GATEWAY_KEY
        auth: bearer               # bearer | raw
```

Новый формат ответа — одна функция-парсер в `index.js`, возвращающая `{ windows: [{ key: '5h' | 'week' | 'month', percent, resetsAt }] }` или `{ balance: { amount, currency } }`.

Тексты интерфейса — таблица `STRINGS` в `client.js`; для нового языка нужен блок там и парный `locale/<code>.json` для карточки плагина.

## Разработка

```bash
node test-client.mjs      # рендер виджета на всех девяти языках, регистрация в composer dock, фильтр по текущей модели
node test-adapters.mjs    # парсеры ответов провайдеров
```

## Лицензия

MIT — см. [LICENSE](LICENSE).
