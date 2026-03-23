import { useState } from 'react'
import ExperienceTab from './components/ExperienceTab'
import TemplatesTab from './components/TemplatesTab'
import SubmissionsTab from './components/SubmissionsTab'
import AnalysisTab from './components/AnalysisTab'
import { Sidebar } from './components/Sidebar'
import type { Tab } from './components/Sidebar'
import { ToastProvider } from './components/Toast'

function App(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<Tab>('experience')

  return (
    <ToastProvider>
      <div
        style={{
          display: 'flex',
          minHeight: '100vh',
          backgroundColor: 'var(--color-bg-base)',
        }}
      >
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <main style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          {activeTab === 'experience' && <ExperienceTab />}
          {activeTab === 'variants' && <TemplatesTab />}
          {activeTab === 'analysis' && <AnalysisTab />}
          {activeTab === 'submissions' && <SubmissionsTab />}
          {activeTab === 'settings' && (
            <div
              style={{
                padding: 'var(--space-6)',
                color: 'var(--color-text-secondary)',
                fontSize: 'var(--font-size-base)',
              }}
            >
              Settings page coming in next plan
            </div>
          )}
        </main>
      </div>
    </ToastProvider>
  )
}

export default App
