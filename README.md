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

The source below carries no version, so every installation takes the newest commit on `main`.

**DSH Desktop and the web GUI** — open **Plugins** in the sidebar, choose **Add plugin**, and paste the source:

```
github:sc5976/dsh-subscription-limits
```

The dialog accepts a package name with an optional version, a Git address, a tarball or an absolute local path; the package name it expects is exactly what follows `dsh plugin add`. DSH reads the package, installs it with the pnpm it ships, and switches the new bundle on. Restart DSH so the host loads it, then refresh the page (F5). Settings → Built-in plugins is the read-only inventory of what the installation ships, not an install surface.

**CLI profile** — needs `pnpm` on `PATH`; DSH Desktop supplies its own.

```bash
dsh plugin --profile <profile> add "github:sc5976/dsh-subscription-limits"
```

The command is `pnpm add` in the profile directory plus bundle activation, so it records the dependency, adds the package to `dsh.profile.bundles` and validates the package the way the Plugins page does. Restart DSH afterwards.

Pin a release when a frozen install matters — append the tag: `github:sc5976/dsh-subscription-limits#v1.3.3`.

A registry install (`dsh plugin --profile <profile> add @scope/name@1.3.3`) would work the same way and is the only form that gives the bundle page a **Versions** section and **Update** controls; this package is not published there — its name is scoped `@local/` and `private`, so GitHub is the channel.

## Updates

A GitHub source is a pnpm git dependency: pnpm records the exact commit it resolved in the profile's `pnpm-lock.yaml`, so an installed copy never changes on its own.

- **DSH Desktop and the web GUI** — **Plugins** in the sidebar → the bundle's page: DSH shows no version picker for a bundle installed from Git (the **Versions** section exists only for registry installs), so updating is uninstall and then install again from the same source — the install dialog says the same above its **Install** button. Restart DSH afterwards so the host loads the new package; the web page then only needs a refresh.
- **CLI** — re-resolve the source, then restart DSH:

```bash
dsh plugin --profile <profile> add "github:sc5976/dsh-subscription-limits"
# or: dsh plugin --profile <profile> update @local/dsh-subscription-limits
```

- **Pinned installs** (`#v1.2.0`) stay on that tag until the source is re-added — without a tag, or with the tag of the release you want.

Every release bumps `package.json` and is tagged (`v1.3.3`, `v1.3.2`, `v1.3.1`, …), so both forms have a defined target: no tag means the newest commit on `main`, a tag means that release permanently.

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
node test-manifest.mjs    # package.json parses without a BOM, exports and bundle patch exist, locale cards load
node test-client.mjs      # widget renders in all nine languages, registers in the composer dock, scopes to the current model
node test-adapters.mjs    # provider response parsers
```

`package.json` is read by DSH with a strict JSON parser, so a UTF-8 BOM makes the package unloadable (`Unexpected token`, the bundle then reports no rows). Windows PowerShell 5.1 adds one to `Set-Content -Encoding UTF8`; write `package.json` as UTF-8 without a BOM.

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

**DSH Desktop и веб-интерфейс** — откройте **Плагины** на боковой панели, нажмите **Добавить плагин** и вставьте источник:

```
github:sc5976/dsh-subscription-limits
```

Диалог принимает имя пакета с необязательной версией, адрес Git-репозитория, tarball или абсолютный локальный путь; имя пакета в нём — ровно то, что идёт после `dsh plugin add`. DSH читает пакет, ставит его своим pnpm и включает новый бандл. Перезапустите DSH, чтобы хост загрузил пакет, затем обновите страницу (F5). Настройки → Встроенные плагины — это только список того, что поставляет сама установка, а не место установки.

**CLI-профиль** — нужен `pnpm` в `PATH`; в DSH Desktop он свой.

```bash
dsh plugin --profile <profile> add "github:sc5976/dsh-subscription-limits"
```

Команда — это `pnpm add` в каталоге профиля плюс активация бандла: записывается зависимость, имя пакета попадает в `dsh.profile.bundles`, а пакет проверяется так же, как на странице плагинов. После этого перезапустите DSH.

Нужна «замороженная» установка — добавьте тег: `github:sc5976/dsh-subscription-limits#v1.3.3`.

Установка из реестра (`dsh plugin --profile <profile> add @scope/name@1.3.3`) работала бы так же и только она даёт на странице плагина раздел **Версии** и кнопки **Обновить**; этот пакет там не опубликован — имя в области `@local/` и стоит `private`, поэтому канал — GitHub.

## Обновление

Источник с GitHub — это git-зависимость pnpm: точный коммит записывается в `pnpm-lock.yaml` профиля, поэтому сама по себе установленная копия не меняется.

- **DSH Desktop и веб-интерфейс** — **Плагины** на боковой панели → страница бандла: для плагина, установленного из Git, выбора версий в DSH нет (раздел **Версии** есть только у установок из реестра), поэтому обновление — это удаление и повторная установка из того же источника; о том же предупреждает сам диалог установки над кнопкой **Установить**. Затем перезапустите DSH, чтобы хост загрузил новый пакет; веб-странице останется только обновиться.
- **CLI** — переразрешите источник и перезапустите DSH:

```bash
dsh plugin --profile <profile> add "github:sc5976/dsh-subscription-limits"
# или: dsh plugin --profile <profile> update @local/dsh-subscription-limits
```

- **Установки с тегом** (`#v1.2.0`) остаются на этом теге, пока источник не добавят заново — без тега или с тегом нужного релиза.

Каждый релиз поднимает версию в `package.json` и получает тег (`v1.3.3`, `v1.3.2`, `v1.3.1`, …), поэтому у обеих форм есть определённая цель: без тега — самый свежий коммит в `main`, с тегом — именно этот релиз.

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
node test-manifest.mjs    # package.json парсится без BOM, exports и патч бандла на месте, локали читаются
node test-client.mjs      # рендер виджета на всех девяти языках, регистрация в composer dock, фильтр по текущей модели
node test-adapters.mjs    # парсеры ответов провайдеров
```

DSH читает `package.json` строгим JSON-парсером, поэтому BOM в начале файла делает пакет незагружаемым (`Unexpected token`, бандл сообщает, что не объявляет ни одного ряда). Windows PowerShell 5.1 добавляет BOM при `Set-Content -Encoding UTF8`; пишите `package.json` как UTF-8 без BOM.

## Лицензия

MIT — см. [LICENSE](LICENSE).
