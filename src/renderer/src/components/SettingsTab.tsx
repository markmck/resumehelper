import { useState, useEffect } from 'react'

type Provider = 'openai' | 'anthropic'
type TestStatus = 'idle' | 'loading' | 'success' | 'error'

const FALLBACK_MODELS: Record<Provider, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini'],
  anthropic: ['claude-sonnet-4-5-20250514'],
}

const THEMES = [
  { label: 'Even', value: 'even' },
  { label: 'Class', value: 'class' },
  { label: 'Elegant', value: 'elegant' },
]

const cardStyle: React.CSSProperties = {
  padding: 'var(--space-6)',
  border: '1px solid var(--color-border-subtle)',
  borderRadius: 'var(--radius-lg)',
  backgroundColor: 'var(--color-bg-surface)',
}

const sectionHeadingStyle: React.CSSProperties = {
  fontSize: 'var(--font-size-lg)',
  color: 'var(--color-text-primary)',
  fontWeight: 600,
  margin: 0,
  marginBottom: 'var(--space-5)',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 'var(--font-size-xs)',
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--color-text-tertiary)',
  marginBottom: 'var(--space-2)',
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  height: '36px',
  backgroundColor: 'var(--color-bg-input)',
  border: '1px solid var(--color-border-default)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--color-text-primary)',
  padding: '0 var(--space-3)',
  fontSize: 'var(--font-size-sm)',
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  height: '36px',
  backgroundColor: 'var(--color-bg-input)',
  border: '1px solid var(--color-border-default)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--color-text-primary)',
  padding: '0 var(--space-3)',
  fontSize: 'var(--font-size-sm)',
  outline: 'none',
}

const fieldGroupStyle: React.CSSProperties = {
  marginBottom: 'var(--space-4)',
}

export function SettingsTab(): React.JSX.Element {
  const [provider, setProvider] = useState<Provider>('openai')
  const [model, setModel] = useState<string>('')
  const [models, setModels] = useState<string[]>([])
  const [modelsLoading, setModelsLoading] = useState<boolean>(false)
  const [apiKey, setApiKey] = useState<string>('')
  const [hasKey, setHasKey] = useState<boolean>(false)
  const [showKey, setShowKey] = useState<boolean>(false)
  const [testStatus, setTestStatus] = useState<TestStatus>('idle')
  const [testMessage, setTestMessage] = useState<string>('')
  const [saving, setSaving] = useState<boolean>(false)
  const [saveError, setSaveError] = useState<string>('')
  const [theme, setTheme] = useState<string>(
    () => localStorage.getItem('preferredTheme') ?? 'even',
  )

  const fetchModels = async (p?: Provider): Promise<void> => {
    setModelsLoading(true)
    try {
      const result = await window.api.settings.listModels()
      if (result.models && result.models.length > 0) {
        setModels(result.models)
      } else {
        setModels(FALLBACK_MODELS[p ?? provider])
      }
    } catch {
      setModels(FALLBACK_MODELS[p ?? provider])
    } finally {
      setModelsLoading(false)
    }
  }

  useEffect(() => {
    window.api.settings.getAi().then((data) => {
      const p = (data.provider as Provider) || 'openai'
      setProvider(p)
      setModel(data.model || '')
      setHasKey(data.hasKey)
      if (data.hasKey) {
        fetchModels(p)
      } else {
        setModels(FALLBACK_MODELS[p])
      }
    })
  }, [])

  function handleProviderChange(newProvider: Provider): void {
    setProvider(newProvider)
    setModels(FALLBACK_MODELS[newProvider])
    setModel(FALLBACK_MODELS[newProvider][0])
    setTestStatus('idle')
    setTestMessage('')
    if (hasKey) {
      // Re-fetch models for new provider after a brief delay (key is already saved)
      fetchModels(newProvider)
    }
  }

  async function handleSave(): Promise<void> {
    setSaving(true)
    setSaveError('')
    try {
      const result = await window.api.settings.setAi({ provider, model, apiKey })
      if ('error' in result) {
        setSaveError(result.error)
      } else {
        setHasKey(true)
        setApiKey('')
        setTestStatus('idle')
        setTestMessage('')
        // Fetch available models now that we have a valid key
        fetchModels()
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  async function handleTestConnection(): Promise<void> {
    setTestStatus('loading')
    setTestMessage('')
    try {
      const result = await window.api.settings.testAi()
      if (result.success) {
        setTestStatus('success')
        setTestMessage('Connection successful')
      } else {
        setTestStatus('error')
        setTestMessage(result.error ?? 'Connection failed')
      }
    } catch (err) {
      setTestStatus('error')
      setTestMessage(err instanceof Error ? err.message : 'Connection failed')
    }
  }

  function handleThemeChange(value: string): void {
    setTheme(value)
    localStorage.setItem('preferredTheme', value)
  }

  return (
    <div
      style={{
        padding: 'var(--space-8)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-6)',
        maxWidth: '640px',
      }}
    >
      {/* Card 1: AI Configuration */}
      <div style={cardStyle}>
        <h2 style={sectionHeadingStyle}>AI Configuration</h2>

        {/* Provider */}
        <div style={fieldGroupStyle}>
          <label style={labelStyle}>Provider</label>
          <select
            style={selectStyle}
            value={provider}
            onChange={(e) => handleProviderChange(e.target.value as Provider)}
          >
            <option value="openai">OpenAI</option>
            <option value="anthropic">Claude (Anthropic)</option>
          </select>
        </div>

        {/* Model */}
        <div style={fieldGroupStyle}>
          <label style={labelStyle}>Model {modelsLoading && <span style={{ fontWeight: 400, textTransform: 'none' as const, letterSpacing: 'normal' }}>(loading...)</span>}</label>
          <select
            style={selectStyle}
            value={model}
            onChange={(e) => {
              setModel(e.target.value)
              setTestStatus('idle')
              setTestMessage('')
            }}
          >
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          {hasKey && (
            <p style={{ marginTop: 'var(--space-1)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
              Models fetched from your provider API
            </p>
          )}
        </div>

        {/* API Key */}
        <div style={fieldGroupStyle}>
          <label style={labelStyle}>API Key</label>
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            <input
              type={showKey ? 'text' : 'password'}
              style={inputStyle}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your API key"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              style={{
                height: '36px',
                width: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--color-bg-input)',
                border: '1px solid var(--color-border-default)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                flexShrink: 0,
              }}
              title={showKey ? 'Hide key' : 'Show key'}
            >
              {showKey ? (
                // Eye-off icon
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                // Eye icon
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
          {hasKey && !apiKey && (
            <p
              style={{
                marginTop: 'var(--space-1)',
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text-tertiary)',
              }}
            >
              API key saved
            </p>
          )}
        </div>

        {/* Save error */}
        {saveError && (
          <p
            style={{
              marginBottom: 'var(--space-3)',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-danger)',
            }}
          >
            {saveError}
          </p>
        )}

        {/* Button row */}
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              height: '36px',
              padding: '0 var(--space-4)',
              backgroundColor: 'var(--color-accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontWeight: 500,
              fontSize: 'var(--font-size-sm)',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testStatus === 'loading'}
            style={{
              height: '36px',
              padding: '0 var(--space-4)',
              backgroundColor: 'transparent',
              border: '1px solid var(--color-border-default)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text-secondary)',
              fontWeight: 500,
              fontSize: 'var(--font-size-sm)',
              cursor: testStatus === 'loading' ? 'not-allowed' : 'pointer',
              opacity: testStatus === 'loading' ? 0.7 : 1,
            }}
          >
            Test Connection
          </button>
        </div>

        {/* Inline test status */}
        {testStatus === 'loading' && (
          <p
            style={{
              marginTop: 'var(--space-3)',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-secondary)',
            }}
          >
            Testing...
          </p>
        )}
        {testStatus === 'success' && (
          <p
            style={{
              marginTop: 'var(--space-3)',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-success)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-1)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {testMessage}
          </p>
        )}
        {testStatus === 'error' && (
          <p
            style={{
              marginTop: 'var(--space-3)',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-danger)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-1)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            {testMessage}
          </p>
        )}
      </div>

      {/* Card 2: Appearance */}
      <div style={cardStyle}>
        <h2 style={sectionHeadingStyle}>Appearance</h2>

        <div style={fieldGroupStyle}>
          <label style={labelStyle}>Default Theme</label>
          <select
            style={selectStyle}
            value={theme}
            onChange={(e) => handleThemeChange(e.target.value)}
          >
            {THEMES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
