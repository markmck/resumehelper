function AnalysisTab(): React.JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        minHeight: '60vh',
        gap: 'var(--space-4)',
        color: 'var(--color-text-secondary)',
      }}
    >
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ opacity: 0.4 }}
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M7 16l3-4 3 3 2-3 2 4" />
      </svg>
      <p
        style={{
          fontSize: 'var(--font-size-md)',
          color: 'var(--color-text-secondary)',
          margin: 0,
          textAlign: 'center',
        }}
      >
        Paste a job posting to start your first analysis
      </p>
      <button
        style={{
          marginTop: 'var(--space-2)',
          padding: '10px 20px',
          backgroundColor: 'var(--color-accent)',
          color: 'var(--color-text-primary)',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--font-size-sm)',
          fontWeight: 500,
          cursor: 'pointer',
          fontFamily: 'var(--font-sans)',
        }}
      >
        Analyze Job Posting
      </button>
    </div>
  )
}

export default AnalysisTab
