import ExperienceTab from './components/ExperienceTab'

type Tab = 'experience' | 'templates' | 'submissions'

const tabs: { id: Tab; label: string; enabled: boolean }[] = [
  { id: 'experience', label: 'Experience', enabled: true },
  { id: 'templates', label: 'Templates', enabled: false },
  { id: 'submissions', label: 'Submissions', enabled: false },
]

function App(): React.JSX.Element {
  const activeTab: Tab = 'experience'

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-zinc-100">
      {/* Tab Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 h-12 bg-zinc-900 border-b border-zinc-800 flex items-center px-4 gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            disabled={!tab.enabled}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab.enabled && activeTab === tab.id
                ? 'bg-zinc-700 text-zinc-100'
                : tab.enabled
                  ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                  : 'text-zinc-600 opacity-50 cursor-not-allowed'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </header>

      {/* Tab Content */}
      <main className="pt-12 flex-1">
        {activeTab === 'experience' && <ExperienceTab />}
      </main>
    </div>
  )
}

export default App
