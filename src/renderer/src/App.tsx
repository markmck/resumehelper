import { useState, useCallback, useEffect, useRef } from 'react'
import ExperienceTab from './components/ExperienceTab'
import TemplatesTab from './components/TemplatesTab'
import SubmissionsTab from './components/SubmissionsTab'
import AnalysisTab from './components/AnalysisTab'
import { Sidebar } from './components/Sidebar'
import type { Tab } from './components/Sidebar'
import { ToastProvider } from './components/Toast'
import { SettingsTab } from './components/SettingsTab'

function App(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<Tab>('experience')
  const [variants, setVariants] = useState<Array<{ id: number; name: string }>>([])
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null)
  const [pendingLogAnalysis, setPendingLogAnalysis] = useState<number | null>(null)

  const handleVariantsLoaded = useCallback((list: Array<{ id: number; name: string }>) => {
    setVariants(list)
  }, [])

  const handleVariantCreate = useCallback(async () => {
    const newVariant = await window.api.templates.create({ name: 'Untitled Variant' })
    setVariants((prev) => [...prev, { id: newVariant.id, name: newVariant.name }])
    setSelectedVariantId(newVariant.id)
    setActiveTab('variants')
  }, [])

  // Tab history for mouse back button / Alt+Left navigation
  const tabHistory = useRef<Tab[]>(['experience'])
  const prevSetActiveTab = setActiveTab
  const navigateTab = useCallback((tab: Tab) => {
    tabHistory.current.push(tab)
    prevSetActiveTab(tab)
  }, [prevSetActiveTab])

  const handleBack = useCallback(() => {
    // First, dispatch a custom event that sub-components can intercept
    const event = new CustomEvent('app:navigate-back', { cancelable: true })
    window.dispatchEvent(event)
    if (event.defaultPrevented) return // A sub-component handled it

    // Otherwise, go back in tab history
    if (tabHistory.current.length > 1) {
      tabHistory.current.pop()
      const prev = tabHistory.current[tabHistory.current.length - 1]
      prevSetActiveTab(prev)
    }
  }, [prevSetActiveTab])

  useEffect(() => {
    // Mouse back button (button 3)
    const handleMouseUp = (e: MouseEvent): void => {
      if (e.button === 3) {
        e.preventDefault()
        handleBack()
      }
    }
    // Alt+Left keyboard shortcut
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault()
        handleBack()
      }
    }
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleBack])

  return (
    <ToastProvider>
      <div
        style={{
          display: 'flex',
          minHeight: '100vh',
          backgroundColor: 'var(--color-bg-base)',
        }}
      >
        <Sidebar
          activeTab={activeTab}
          onTabChange={navigateTab}
          variants={variants}
          selectedVariantId={selectedVariantId}
          onVariantSelect={(id) => { setSelectedVariantId(id); navigateTab('variants') }}
          onVariantCreate={handleVariantCreate}
        />
        <main style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          {activeTab === 'experience' && <ExperienceTab />}
          {activeTab === 'variants' && (
            <TemplatesTab
              selectedVariantId={selectedVariantId}
              onVariantsLoaded={handleVariantsLoaded}
              onSelectedChange={setSelectedVariantId}
            />
          )}
          {activeTab === 'analysis' && <AnalysisTab onLogSubmission={(analysisId: number) => {
            setPendingLogAnalysis(analysisId)
            navigateTab('submissions')
          }} />}
          {activeTab === 'submissions' && <SubmissionsTab
            initialLogAnalysisId={pendingLogAnalysis}
            onLogAnalysisConsumed={() => setPendingLogAnalysis(null)}
          />}
          {activeTab === 'settings' && <SettingsTab />}
        </main>
      </div>
    </ToastProvider>
  )
}

export default App
