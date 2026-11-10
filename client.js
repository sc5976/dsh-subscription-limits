/**
 * Subscription limits — browser half.
 *
 * A compact chip in the composer dock. Hovering (or clicking to pin) opens a
 * floating card with the used share of every subscription window the host
 * reports: 5-hour session, week, month, plus prepaid balances. The card ships
 * nine UI languages (English by default, with a switcher for Russian, Chinese,
 * French, Spanish, German, Portuguese, Japanese and Korean); the choice
 * persists per browser. All provider probing happens host-side, so this module
 * only reads same-origin JSON.
 */

window.__ModuleLoader__.load({
  id: '@local/dsh-subscription-limits',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useState, useEffect, useRef, useCallback } = React

    /** Document-relative so a sub-path deployment still resolves it. */
    const API_PATH = 'api/subscription-limits/overview'
    const POLL_MS = 60_000
    const HIDE_DELAY_MS = 180
    const POPOVER_WIDTH = 380
    const LANGUAGE_KEY = 'dsh-subscription-limits.lang'
    const DEFAULT_LANGUAGE = 'en'

    /** UI copy per language. `windows` name provider windows, `chip` abbreviates them. */
    const STRINGS = {
      en: {
        title: 'Subscription limits',
        subscriptions: 'Subscriptions',
        balances: 'Balances',
        balance: 'Balance',
        updated: 'updated {time}',
        loading: 'Loading…',
        noData: 'No subscription data',
        noProviders: 'No providers configured',
        refreshNote: 'refreshes every minute',
        pinHint: 'click to pin',
        pinnedHint: 'pinned · click to close',
        language: 'Language',
        chipTitle: 'Subscription limits — hover for details',
        error: 'no data',
        windows: { '5h': '5 hours', week: 'Week', month: 'Month' },
        chip: { '5h': '5h', week: 'wk', month: 'mo' },
        resetAt: 'resets at {time}',
        resetOn: 'resets {date} at {time}',
      },
      ru: {
        title: 'Лимиты подписок',
        subscriptions: 'Подписки',
        balances: 'Балансы',
        balance: 'Баланс',
        updated: 'обновлено {time}',
        loading: 'Загрузка…',
        noData: 'Нет данных по подпискам',
        noProviders: 'Провайдеры не настроены',
        refreshNote: 'обновляется раз в минуту',
        pinHint: 'клик — закрепить',
        pinnedHint: 'закреплено · клик, чтобы закрыть',
        language: 'Язык',
        chipTitle: 'Лимиты подписок — наведите для деталей',
        error: 'нет данных',
        windows: { '5h': '5 часов', week: 'Неделя', month: 'Месяц' },
        chip: { '5h': '5ч', week: 'нед', month: 'мес' },
        resetAt: 'сброс в {time}',
        resetOn: 'сброс {date} в {time}',
      },
      zh: {
        title: '订阅额度',
        subscriptions: '订阅',
        balances: '余额',
        balance: '余额',
        updated: '更新于 {time}',
        loading: '加载中…',
        noData: '暂无订阅数据',
        noProviders: '未配置提供商',
        refreshNote: '每分钟刷新',
        pinHint: '点击固定',
        pinnedHint: '已固定 · 点击关闭',
        language: '语言',
        chipTitle: '订阅额度 — 悬停查看详情',
        error: '无数据',
        windows: { '5h': '5 小时', week: '周', month: '月' },
        chip: { '5h': '5时', week: '周', month: '月' },
        resetAt: '{time} 重置',
        resetOn: '{date} {time} 重置',
      },
      fr: {
        title: 'Limites d’abonnement',
        subscriptions: 'Abonnements',
        balances: 'Soldes',
        balance: 'Solde',
        updated: 'mis à jour à {time}',
        loading: 'Chargement…',
        noData: 'Aucune donnée d’abonnement',
        noProviders: 'Aucun fournisseur configuré',
        refreshNote: 'actualisé chaque minute',
        pinHint: 'cliquer pour épingler',
        pinnedHint: 'épinglé · cliquer pour fermer',
        language: 'Langue',
        chipTitle: 'Limites d’abonnement — survolez pour les détails',
        error: 'aucune donnée',
        windows: { '5h': '5 heures', week: 'Semaine', month: 'Mois' },
        chip: { '5h': '5 h', week: 'sem', month: 'mois' },
        resetAt: 'réinit. à {time}',
        resetOn: 'réinit. le {date} à {time}',
      },
      es: {
        title: 'Límites de suscripción',
        subscriptions: 'Suscripciones',
        balances: 'Saldos',
        balance: 'Saldo',
        updated: 'actualizado a las {time}',
        loading: 'Cargando…',
        noData: 'Sin datos de suscripción',
        noProviders: 'No hay proveedores configurados',
        refreshNote: 'se actualiza cada minuto',
        pinHint: 'clic para fijar',
        pinnedHint: 'fijado · clic para cerrar',
        language: 'Idioma',
        chipTitle: 'Límites de suscripción — pasa el cursor para ver detalles',
        error: 'sin datos',
        windows: { '5h': '5 horas', week: 'Semana', month: 'Mes' },
        chip: { '5h': '5 h', week: 'sem', month: 'mes' },
        resetAt: 'se restablece a las {time}',
        resetOn: 'se restablece el {date} a las {time}',
      },
      de: {
        title: 'Abo-Limits',
        subscriptions: 'Abos',
        balances: 'Guthaben',
        balance: 'Guthaben',
        updated: 'aktualisiert um {time}',
        loading: 'Wird geladen…',
        noData: 'Keine Abo-Daten',
        noProviders: 'Keine Anbieter konfiguriert',
        refreshNote: 'aktualisiert jede Minute',
        pinHint: 'zum Anheften klicken',
        pinnedHint: 'angeheftet · zum Schließen klicken',
        language: 'Sprache',
        chipTitle: 'Abo-Limits — für Details mit der Maus darüberfahren',
        error: 'keine Daten',
        windows: { '5h': '5 Stunden', week: 'Woche', month: 'Monat' },
        chip: { '5h': '5 Std', week: 'Wo.', month: 'Mon.' },
        resetAt: 'Reset um {time}',
        resetOn: 'Reset am {date} um {time}',
      },
      pt: {
        title: 'Limites da assinatura',
        subscriptions: 'Assinaturas',
        balances: 'Saldos',
        balance: 'Saldo',
        updated: 'atualizado às {time}',
        loading: 'Carregando…',
        noData: 'Sem dados de assinatura',
        noProviders: 'Nenhum provedor configurado',
        refreshNote: 'atualiza a cada minuto',
        pinHint: 'clique para fixar',
        pinnedHint: 'fixado · clique para fechar',
        language: 'Idioma',
        chipTitle: 'Limites da assinatura — passe o cursor para ver os detalhes',
        error: 'sem dados',
        windows: { '5h': '5 horas', week: 'Semana', month: 'Mês' },
        chip: { '5h': '5 h', week: 'sem.', month: 'mês' },
        resetAt: 'reinicia às {time}',
        resetOn: 'reinicia em {date} às {time}',
      },
      ja: {
        title: 'サブスクリプションの上限',
        subscriptions: 'サブスクリプション',
        balances: '残高',
        balance: '残高',
        updated: '{time} 更新',
        loading: '読み込み中…',
        noData: 'サブスクリプションのデータがありません',
        noProviders: 'プロバイダーが設定されていません',
        refreshNote: '1分ごとに更新',
        pinHint: 'クリックで固定',
        pinnedHint: '固定中 · クリックで閉じる',
        language: '言語',
        chipTitle: 'サブスクリプションの上限 — カーソルを合わせると詳細を表示',
        error: 'データなし',
        windows: { '5h': '5時間', week: '週間', month: '月間' },
        chip: { '5h': '5h', week: '週', month: '月' },
        resetAt: '{time} にリセット',
        resetOn: '{date} {time} にリセット',
      },
      ko: {
        title: '구독 한도',
        subscriptions: '구독',
        balances: '잔액',
        balance: '잔액',
        updated: '{time} 업데이트',
        loading: '불러오는 중…',
        noData: '구독 데이터가 없습니다',
        noProviders: '설정된 프로바이더가 없습니다',
        refreshNote: '1분마다 새로 고침',
        pinHint: '클릭하여 고정',
        pinnedHint: '고정됨 · 클릭하여 닫기',
        language: '언어',
        chipTitle: '구독 한도 — 자세히 보려면 마우스를 올리세요',
        error: '데이터 없음',
        windows: { '5h': '5시간', week: '주간', month: '월간' },
        chip: { '5h': '5h', week: '주', month: '월' },
        resetAt: '{time}에 재설정',
        resetOn: '{date} {time}에 재설정',
      },
    }

    /** The languages the switcher offers, in display order. */
    const LANGUAGES = [
      ['en', 'English'],
      ['ru', 'Русский'],
      ['zh', '中文'],
      ['fr', 'Français'],
      ['es', 'Español'],
      ['de', 'Deutsch'],
      ['pt', 'Português'],
      ['ja', '日本語'],
      ['ko', '한국어'],
    ]

    /** BCP 47 tags for date/time formatting. */
    const LOCALE_TAG = {
      en: 'en-GB',
      ru: 'ru-RU',
      zh: 'zh-CN',
      fr: 'fr-FR',
      es: 'es-ES',
      de: 'de-DE',
      pt: 'pt-BR',
      ja: 'ja-JP',
      ko: 'ko-KR',
    }

    /** Provider brand abbreviations that stay the same in every language. */
    const SHORT_NAME = {
      'opencode-go': 'OCG',
      minimax: 'MiniMax',
      'minimax-cn': 'MiniMax CN',
      zai: 'Z.ai',
      'zai-coding-cn': 'GLM CN',
      'kimi-coding': 'Kimi',
      openrouter: 'OpenRouter',
      deepseek: 'DeepSeek',
      'moonshot-cn': 'Moonshot CN',
      moonshot: 'Moonshot',
    }

    /** Persisted UI language; an unknown or unreadable value keeps English. */
    function readLanguage() {
      try {
        const stored = window.localStorage.getItem(LANGUAGE_KEY)
        return stored !== null && STRINGS[stored] !== undefined ? stored : DEFAULT_LANGUAGE
      } catch {
        return DEFAULT_LANGUAGE
      }
    }

    /** Persist the UI language; storage failures keep the session choice. */
    function writeLanguage(language) {
      try {
        window.localStorage.setItem(LANGUAGE_KEY, language)
      } catch {
        // Storage unavailable: the session still renders the chosen language.
      }
    }

    /** Fill `{placeholders}` in one copy string. */
    function fill(template, values) {
      return Object.entries(values).reduce((text, [key, value]) => text.replace('{' + key + '}', String(value)), template)
    }

    /** Percentage text, em dash when the provider did not report it. */
    function formatPercent(value) {
      return typeof value === 'number' && Number.isFinite(value) ? Math.round(value) + '%' : '—'
    }

    /** Traffic-light color for a used percentage. */
    function colorFor(percent) {
      if (typeof percent !== 'number' || !Number.isFinite(percent)) return 'var(--dsw-alias-label-tertiary)'
      if (percent >= 90) return 'var(--dsw-alias-state-error-primary)'
      if (percent >= 70) return 'var(--dsw-alias-state-warn-primary)'
      return 'var(--dsw-alias-state-success-primary)'
    }

    /** Currency-prefixed balance amount. */
    function formatBalance(balance) {
      if (!balance || typeof balance.amount !== 'string') return '—'
      const currency = String(balance.currency || '').toUpperCase()
      if (currency === 'USD') return '$' + balance.amount
      if (currency === 'CNY') return '¥' + balance.amount
      return (currency ? currency + ' ' : '') + balance.amount
    }

    /** Local clock label for an ISO instant. */
    function formatClock(iso, language) {
      const date = new Date(iso)
      if (Number.isNaN(date.getTime())) return ''
      return date.toLocaleTimeString(LOCALE_TAG[language] ?? LOCALE_TAG.en, { hour: '2-digit', minute: '2-digit' })
    }

    /** "resets at 17:12" / "resets 16.11 at 00:00" in the active language. */
    function formatReset(iso, language, t) {
      if (typeof iso !== 'string') return ''
      const date = new Date(iso)
      if (Number.isNaN(date.getTime())) return ''
      const now = new Date()
      const sameDay = date.getFullYear() === now.getFullYear()
        && date.getMonth() === now.getMonth()
        && date.getDate() === now.getDate()
      const tag = LOCALE_TAG[language] ?? LOCALE_TAG.en
      const time = date.toLocaleTimeString(tag, { hour: '2-digit', minute: '2-digit' })
      if (sameDay) return fill(t.resetAt, { time })
      const day = date.toLocaleDateString(tag, { day: '2-digit', month: '2-digit' })
      return fill(t.resetOn, { date: day, time })
    }

    /** Clock label of the last successful probe. */
    function formatUpdated(timestamp, language, t) {
      if (typeof timestamp !== 'number') return ''
      return fill(t.updated, { time: formatClock(new Date(timestamp).toISOString(), language) })
    }

    /** One quota window: label, usage bar, percent, reset time. */
    function WindowRow(props) {
      const { window, language, t } = props
      const percent = typeof window.percent === 'number' ? Math.max(0, Math.min(100, window.percent)) : 0
      const label = t.windows[window.key] || window.key
      return h('div', {
        style: { display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' },
      },
        h('span', {
          style: { width: 74, flex: '0 0 74px', color: 'var(--dsw-alias-label-secondary)', fontSize: 11 },
        }, label),
        h('div', {
          style: {
            flex: 1,
            height: 6,
            borderRadius: 3,
            background: 'var(--dsw-alias-bg-layer-3, rgba(255,255,255,0.14))',
            overflow: 'hidden',
          },
        }, h('div', {
          style: {
            width: Math.max(2, percent) + '%',
            height: '100%',
            borderRadius: 3,
            background: colorFor(window.percent),
            transition: 'width 160ms ease',
          },
        })),
        h('span', {
          style: {
            width: 38,
            flex: '0 0 38px',
            textAlign: 'right',
            fontVariantNumeric: 'tabular-nums',
            color: 'var(--dsw-alias-label-primary)',
            fontSize: 11.5,
          },
        }, formatPercent(window.percent)),
        h('span', {
          style: {
            width: 132,
            flex: '0 0 132px',
            textAlign: 'right',
            color: 'var(--dsw-alias-label-tertiary)',
            fontSize: 10.5,
            lineHeight: 1.25,
            overflowWrap: 'break-word',
          },
        }, formatReset(window.resetsAt, language, t)),
      )
    }

    /** One provider block inside the popover. */
    function ProviderBlock(props) {
      const { provider, language, t } = props
      const windows = Array.isArray(provider.windows) ? provider.windows : []
      const rows = provider.kind === 'balance'
        ? [h('div', {
            key: 'balance',
            style: { display: 'flex', justifyContent: 'space-between', padding: '3px 0' },
          },
            h('span', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 11 } }, t.balance),
            h('span', { style: { fontVariantNumeric: 'tabular-nums' } }, formatBalance(provider.balance)),
          )]
        : windows.map((window) => h(WindowRow, { key: window.key, window, language, t }))
      return h('div', { style: { marginBottom: 10 } },
        h('div', {
          style: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 2,
          },
        },
          h('span', { style: { fontWeight: 600, fontSize: 12 } }, provider.name),
          provider.status === 'error'
            ? h('span', {
                style: { color: 'var(--dsw-alias-state-error-primary)', fontSize: 10.5 },
                title: provider.error,
              }, t.error)
            : null,
        ),
        provider.status === 'error' && provider.error
          ? h('div', { style: { color: 'var(--dsw-alias-label-tertiary)', fontSize: 10.5 } }, provider.error)
          : null,
        rows,
      )
    }

    /** Small caps section heading inside the popover. */
    const sectionTitleStyle = {
      color: 'var(--dsw-alias-label-tertiary)',
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      margin: '10px 0 4px',
    }

    /** Language switcher; the persisted choice survives reloads. */
    function LanguageSelect(props) {
      const { language, onChange, label } = props
      return h('select', {
        value: language,
        'aria-label': label,
        title: label,
        onClick: (event) => event.stopPropagation(),
        onMouseDown: (event) => event.stopPropagation(),
        onChange: (event) => onChange(event.target.value),
        style: {
          fontSize: 10.5,
          padding: '1px 4px',
          borderRadius: 6,
          border: '1px solid var(--dsw-alias-border-l2, rgba(255,255,255,0.16))',
          background: 'var(--dsw-alias-bg-layer-2, rgba(255,255,255,0.08))',
          color: 'var(--dsw-alias-label-secondary)',
          cursor: 'pointer',
          outline: 'none',
          maxWidth: 110,
        },
      }, ...LANGUAGES.map(([value, name]) => h('option', { key: value, value }, name)))
    }

    /** The widget: chip + hover/pinned popover with a language switcher. */
    function LimitsWidget() {
      const [state, setState] = useState({ status: 'loading', data: null, error: null })
      const [open, setOpen] = useState(false)
      const [pinned, setPinned] = useState(false)
      const [position, setPosition] = useState(null)
      const [language, setLanguage] = useState(readLanguage)
      const rootRef = useRef(null)
      const hideTimer = useRef(null)
      const t = STRINGS[language] ?? STRINGS[DEFAULT_LANGUAGE]

      const changeLanguage = useCallback((next) => {
        if (STRINGS[next] === undefined) return
        writeLanguage(next)
        setLanguage(next)
      }, [])

      const load = useCallback(() => {
        fetch(API_PATH, { signal: AbortSignal.timeout(15_000) })
          .then((response) => {
            if (!response.ok) throw new Error('HTTP ' + response.status)
            return response.json()
          })
          .then((data) => setState({ status: 'ready', data, error: null }))
          .catch((error) => {
            const message = error instanceof Error ? error.message : String(error)
            setState((previous) => previous.data
              ? { status: 'stale', data: previous.data, error: message }
              : { status: 'error', data: null, error: message })
          })
      }, [])

      useEffect(() => {
        load()
        const timer = setInterval(() => {
          if (document.visibilityState === 'visible') load()
        }, POLL_MS)
        return () => {
          clearInterval(timer)
          clearTimeout(hideTimer.current)
        }
      }, [load])

      useEffect(() => {
        if (!pinned) return undefined
        const onPointerDown = (event) => {
          if (rootRef.current && !rootRef.current.contains(event.target)) {
            setPinned(false)
            setOpen(false)
          }
        }
        document.addEventListener('mousedown', onPointerDown)
        return () => document.removeEventListener('mousedown', onPointerDown)
      }, [pinned])

      const show = useCallback(() => {
        clearTimeout(hideTimer.current)
        const element = rootRef.current
        if (!element) return
        const rect = element.getBoundingClientRect()
        const left = Math.max(8, Math.min(rect.left, window.innerWidth - POPOVER_WIDTH - 8))
        const bottom = Math.max(8, window.innerHeight - rect.top + 8)
        setPosition({ left, bottom })
        setOpen(true)
        load()
      }, [load])

      const hideSoon = useCallback(() => {
        clearTimeout(hideTimer.current)
        if (pinned) return
        hideTimer.current = setTimeout(() => setOpen(false), HIDE_DELAY_MS)
      }, [pinned])

      const cancelHide = useCallback(() => {
        clearTimeout(hideTimer.current)
      }, [])

      const togglePinned = useCallback(() => {
        if (pinned) {
          setPinned(false)
          setOpen(false)
          return
        }
        setPinned(true)
        show()
      }, [pinned, show])

      const data = state.data
      const providers = data && Array.isArray(data.providers) ? data.providers : []
      const planProviders = providers.filter((provider) => provider.kind === 'plan'
        && Array.isArray(provider.windows) && provider.windows.length > 0)
      const balanceProviders = providers.filter((provider) => provider.kind === 'balance' && provider.balance)

      let worstPercent = -1
      for (const provider of planProviders) {
        for (const window of provider.windows) {
          if (typeof window.percent === 'number' && window.percent > worstPercent) worstPercent = window.percent
        }
      }

      const primary = planProviders[0]
      const parts = []
      if (primary) {
        parts.push(SHORT_NAME[primary.id] || primary.name)
        const windowOf = (key) => primary.windows.find((window) => window.key === key)
        for (const key of ['5h', 'week']) {
          const window = windowOf(key)
          if (window) parts.push(t.chip[key] + ' ' + formatPercent(window.percent))
        }
        if (planProviders.length > 1) parts.push('+' + (planProviders.length - 1))
      }
      const chipText = parts.length > 0 ? parts.join(' · ') : t.title

      const popover = open && position
        ? h('div', {
            role: 'dialog',
            'aria-label': t.title,
            onMouseEnter: cancelHide,
            onMouseLeave: hideSoon,
            style: {
              position: 'fixed',
              left: position.left,
              bottom: position.bottom,
              zIndex: 4000,
              width: POPOVER_WIDTH,
              maxHeight: '70vh',
              overflowY: 'auto',
              boxSizing: 'border-box',
              padding: '12px 14px',
              borderRadius: 10,
              border: '1px solid var(--dsw-alias-border-l2, rgba(255,255,255,0.14))',
              background: 'var(--dsw-alias-bg-overlay, #202124)',
              color: 'var(--dsw-alias-label-primary)',
              boxShadow: '0 10px 32px rgba(0, 0, 0, 0.35)',
              fontSize: 12,
            },
          },
            h('div', {
              style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
            },
              h('span', { style: { fontWeight: 600, fontSize: 12.5 } }, t.title),
              h(LanguageSelect, { language, onChange: changeLanguage, label: t.language }),
            ),
            data
              ? h('div', {
                  style: { color: 'var(--dsw-alias-label-tertiary)', fontSize: 10.5, marginTop: 2 },
                }, formatUpdated(data.updatedAt, language, t))
              : null,
            planProviders.length > 0
              ? [h('div', { key: 'plan-title', style: sectionTitleStyle }, t.subscriptions),
                 ...planProviders.map((provider) => h(ProviderBlock, { key: provider.id, provider, language, t }))]
              : (state.status === 'loading'
                  ? h('div', { style: { color: 'var(--dsw-alias-label-tertiary)', padding: '6px 0' } }, t.loading)
                  : h('div', { style: { color: 'var(--dsw-alias-label-tertiary)', padding: '6px 0' } },
                      providers.length === 0 ? t.noProviders : t.noData,
                      state.error && providers.length > 0 ? ' (' + state.error + ')' : '')),
            balanceProviders.length > 0
              ? [h('div', { key: 'balance-title', style: sectionTitleStyle }, t.balances),
                 ...balanceProviders.map((provider) => h(ProviderBlock, { key: provider.id, provider, language, t }))]
              : null,
            h('div', {
              style: {
                marginTop: 8,
                paddingTop: 8,
                borderTop: '1px solid var(--dsw-alias-border-l2, rgba(255,255,255,0.1))',
                color: 'var(--dsw-alias-label-tertiary)',
                fontSize: 10.5,
                display: 'flex',
                justifyContent: 'space-between',
                gap: 8,
              },
            },
              h('span', null, t.refreshNote),
              h('span', null, pinned ? t.pinnedHint : t.pinHint),
            ),
          )
        : null

      return h('div', {
        ref: rootRef,
        onMouseEnter: show,
        onMouseLeave: hideSoon,
        style: { position: 'relative', display: 'inline-flex', alignItems: 'center' },
      },
        h('div', {
          role: 'button',
          tabIndex: 0,
          'aria-haspopup': 'dialog',
          'aria-expanded': open,
          title: t.chipTitle,
          onClick: togglePinned,
          onKeyDown: (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              togglePinned()
            }
          },
          style: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '2px 8px',
            borderRadius: 999,
            cursor: 'pointer',
            userSelect: 'none',
            color: 'var(--dsw-alias-label-secondary)',
            background: open ? 'var(--dsw-alias-interactive-bg-hover, rgba(255,255,255,0.08))' : 'transparent',
            transition: 'background 120ms ease',
          },
        },
          h('span', {
            'aria-hidden': 'true',
            style: {
              width: 6,
              height: 6,
              borderRadius: '50%',
              flex: '0 0 6px',
              background: worstPercent < 0 ? 'var(--dsw-alias-label-tertiary)' : colorFor(worstPercent),
            },
          }),
          h('span', {
            style: {
              fontSize: 11,
              whiteSpace: 'nowrap',
              fontVariantNumeric: 'tabular-nums',
              color: 'var(--dsw-alias-label-secondary)',
            },
          }, chipText),
        ),
        popover,
      )
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
          name: 'conversation.composer.dock',
          id: 'subscription-limits',
          order: 5,
        }, LimitsWidget))
      },
    }
  },
})
