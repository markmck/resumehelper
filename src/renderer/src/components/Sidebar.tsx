import { useState } from 'react'

export type Tab = 'experience' | 'variants' | 'analysis' | 'submissions' | 'settings'

interface NavItem {
  id: Tab
  label: string
  icon: React.ReactNode
}

function BriefcaseIcon(): React.JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <line x1="12" y1="12" x2="12" y2="12.01" />
    </svg>
  )
}

function LayersIcon(): React.JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  )
}

function ChartBarIcon(): React.JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  )
}

function SendIcon(): React.JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

function GearIcon(): React.JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function ChevronLeftIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function ChevronRightIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

const mainNavItems: NavItem[] = [
  { id: 'experience', label: 'Experience', icon: <BriefcaseIcon /> },
  { id: 'variants', label: 'Variants', icon: <LayersIcon /> },
  { id: 'analysis', label: 'Analysis', icon: <ChartBarIcon /> },
  { id: 'submissions', label: 'Submissions', icon: <SendIcon /> },
]

const bottomNavItems: NavItem[] = [
  { id: 'settings', label: 'Settings', icon: <GearIcon /> },
]

interface VariantInfo {
  id: number
  name: string
}

interface SidebarProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  variants?: VariantInfo[]
  selectedVariantId?: number | null
  onVariantSelect?: (id: number) => void
  onVariantCreate?: () => void
}

export function Sidebar({ activeTab, onTabChange, variants, selectedVariantId, onVariantSelect, onVariantCreate }: SidebarProps): React.JSX.Element {
  const [collapsed, setCollapsed] = useState(false)

  const sidebarWidth = collapsed ? 48 : 240

  const renderNavButton = (item: NavItem): React.JSX.Element => {
    const isActive = activeTab === item.id
    return (
      <button
        key={item.id}
        title={collapsed ? item.label : undefined}
        onClick={() => onTabChange(item.id)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          padding: '8px 12px',
          borderRadius: 'var(--radius-md)',
          border: 'none',
          cursor: 'pointer',
          backgroundColor: isActive ? 'var(--color-bg-raised)' : 'transparent',
          color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
          fontWeight: isActive ? 500 : 400,
          fontSize: 'var(--font-size-base)',
          fontFamily: 'var(--font-sans)',
          textAlign: 'left',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          width: '100%',
          transition: 'background-color 0.15s ease, color 0.15s ease',
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-bg-raised)'
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'
          }
        }}
      >
        <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
          {item.icon}
        </span>
        {!collapsed && (
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {item.label}
          </span>
        )}
      </button>
    )
  }

  return (
    <aside
      style={{
        width: sidebarWidth,
        minWidth: sidebarWidth,
        height: '100vh',
        backgroundColor: 'var(--color-bg-surface)',
        borderRight: '1px solid var(--color-border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease, min-width 0.2s ease',
        overflow: 'hidden',
      }}
    >
      {/* Brand */}
      {!collapsed && (
        <div style={{ padding: '12px 16px 4px', fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-sans)' }}>
          ResumeHelper
        </div>
      )}

      {/* Main Nav Items */}
      <nav
        style={{
          padding: 'var(--space-2)',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {mainNavItems.map(renderNavButton)}
      </nav>

      {/* Variant sub-list when on Variants tab */}
      {activeTab === 'variants' && !collapsed && variants && (
        <div style={{ padding: '0 var(--space-2)', flex: 1, overflow: 'auto' }}>
          <div style={{ height: 1, backgroundColor: 'var(--color-border-subtle)', margin: '4px 0 8px' }} />
          <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: 'var(--color-text-muted)', padding: '4px 12px 4px' }}>
            Variants
          </div>
          {variants.map((v) => {
            const isSelected = selectedVariantId === v.id
            return (
              <button
                key={v.id}
                onClick={() => onVariantSelect?.(v.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '6px 12px 6px 24px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: isSelected ? 'var(--color-accent-bg)' : 'transparent',
                  color: isSelected ? 'var(--color-accent-light)' : 'var(--color-text-tertiary)',
                  fontSize: 'var(--font-size-sm)',
                  fontFamily: 'var(--font-sans)',
                  textAlign: 'left',
                  width: '100%',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  marginBottom: 1,
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-bg-raised)'
                    ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-secondary)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'
                    ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-tertiary)'
                  }
                }}
              >
                {v.name}
              </button>
            )
          })}
          <div style={{ padding: '8px 12px' }}>
            <button
              onClick={onVariantCreate}
              style={{
                width: '100%',
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border-default)',
                backgroundColor: 'transparent',
                color: 'var(--color-text-secondary)',
                fontSize: 'var(--font-size-xs)',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              + New variant
            </button>
          </div>
        </div>
      )}

      {/* Spacer */}
      <div style={{ flex: activeTab === 'variants' && !collapsed ? 0 : 1 }} />

      {/* Divider + Settings */}
      <div style={{ padding: '0 var(--space-2)' }}>
        <div style={{ height: 1, backgroundColor: 'var(--color-border-subtle)', margin: '4px 0' }} />
        {bottomNavItems.map(renderNavButton)}
      </div>

      {/* Collapse Toggle */}
      <div
        style={{
          padding: 'var(--space-2)',
        }}
      >
        <button
          onClick={() => setCollapsed((prev) => !prev)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-end',
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: 'transparent',
            color: 'var(--color-text-tertiary)',
            width: '100%',
            transition: 'background-color 0.15s ease, color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-bg-raised)'
            ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-secondary)'
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'
            ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-tertiary)'
          }}
        >
          {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
