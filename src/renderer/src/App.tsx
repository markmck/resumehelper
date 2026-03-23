import { useState, useCallback } from 'react'
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

  const handleVariantsLoaded = useCallback((list: Array<{ id: number; name: string }>) => {
    setVariants(list)
  }, [])

  const handleVariantCreate = useCallback(async () => {
    const newVariant = await window.api.templates.create({ name: 'Untitled Variant' })
    setVariants((prev) => [...prev, { id: newVariant.id, name: newVariant.name }])
    setSelectedVariantId(newVariant.id)
    setActiveTab('variants')
  }, [])

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
          onTabChange={setActiveTab}
          variants={variants}
          selectedVariantId={selectedVariantId}
          onVariantSelect={(id) => { setSelectedVariantId(id); setActiveTab('variants') }}
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
          {activeTab === 'analysis' && <AnalysisTab />}
          {activeTab === 'submissions' && <SubmissionsTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </main>
      </div>
    </ToastProvider>
  )
}

export default App
