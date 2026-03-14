function ExperienceTab(): React.JSX.Element {
  return (
    <div className="overflow-y-auto h-[calc(100vh-48px)]">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Work History Section */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-zinc-300 mb-4">Work History</h2>
          <div className="text-zinc-500 text-sm">Loading work history...</div>
        </section>

        {/* Skills Section */}
        <section>
          <h2 className="text-lg font-semibold text-zinc-300 mb-4">Skills</h2>
          <div className="text-zinc-500 text-sm">Skills section — coming in Plan 03</div>
        </section>
      </div>
    </div>
  )
}

export default ExperienceTab
