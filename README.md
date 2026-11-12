# dsh-subscription-limits

**English** | [Русский](#русский)

Subscription quota and balance monitor for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). A small chip in the composer shows how much of your subscription limits is used; hover it — or click to pin — to see the 5-hour, weekly and monthly windows, reset times and prepaid balances. By default the chip and card are scoped to the provider that serves the session's current model; the **All** switch next to the language selector widens them to every tracked provider.

## What it is

- **Quotas** — OpenCode Go, MiniMax, GLM Coding Plan (Z.AI / BigModel), Kimi For Coding.
- **Balances** — OpenRouter, DeepSeek, Moonshot.
- **Scoped by default** — only the current model's provider is shown; the **All** toggle (remembered per browser) lists every provider.
- **Frontier models** — supported only through those plans (e.g. Claude models inside OpenCode Go); first-party ChatGPT, Claude, Gemini, Copilot and Cursor subscriptions are not tracked; they expose no public usage API.
- **Nine UI languages** — English (default), Russian, Chinese, French, Spanish, German, Portuguese, Japanese, Korean; switch in the card, the choice is remembered.
- **No extra settings tab** — a compact chip near the input plus a hover/pinned card.
- Keys are read host-side only; the browser receives percentages and amounts, never secrets.

## Install

**DSH Desktop** — Settings → Plugins → install by package source:

```
github:sc5976/dsh-subscription-limits#v1.2.0
```

Then refresh the page (F5).

**CLI profile**

```bash
dsh plugin --profile <profile> add "github:sc5976/dsh-subscription-limits#v1.2.0"
```

Add the package name to the profile's `dsh.profile.bundles` if the plugin manager did not.

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
- **Передовые модели** — только через эти планы (например, модели Claude внутри OpenCode Go); официальные подписки ChatGPT, Claude, Gemini, Copilot и Cursor не отслеживаются — у них нет публичного API учёта использования.
- **Девять языков интерфейса** — английский (по умолчанию), русский, китайский, французский, испанский, немецкий, португальский, японский, корейский; переключатель в карточке, выбор запоминается.
- **Без отдельной вкладки настроек** — чип рядом с полем ввода и карточка по наведению/закреплению.
- Ключи читаются только на стороне хоста; в браузер уходят проценты и суммы, но не секреты.

## Установка

**DSH Desktop** — Настройки → Плагины → установить по источнику:

```
github:sc5976/dsh-subscription-limits#v1.2.0
```

Затем обновите страницу (F5).

**CLI-профиль**

```bash
dsh plugin --profile <profile> add "github:sc5976/dsh-subscription-limits#v1.2.0"
```

Имя пакета добавьте в `dsh.profile.bundles` профиля, если менеджер плагинов не сделал это сам.

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
