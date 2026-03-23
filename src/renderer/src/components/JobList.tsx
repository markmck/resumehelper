import { useEffect, useState } from 'react'
import JobAddForm from './JobAddForm'
import JobItem from './JobItem'

interface Bullet {
  id: number
  jobId: number
  text: string
  sortOrder: number
}

interface Job {
  id: number
  company: string
  role: string
  startDate: string
  endDate: string | null
  createdAt: Date
  bullets: Bullet[]
}

function JobList(): React.JSX.Element {
  const [jobs, setJobs] = useState<Job[]>([])
  const [adding, setAdding] = useState(false)
  const [loading, setLoading] = useState(true)
  const [addHovered, setAddHovered] = useState(false)
  const [emptyAddHovered, setEmptyAddHovered] = useState(false)

  useEffect(() => {
    window.api.jobs.list().then((data) => {
      setJobs(data as Job[])
      setLoading(false)
    })
  }, [])

  const handleAddJob = async (data: {
    company: string
    role: string
    startDate: string
    endDate?: string
  }): Promise<void> => {
    const newJob = await window.api.jobs.create(data)
    setJobs((prev) => [{ ...newJob, bullets: [] } as Job, ...prev])
    setAdding(false)
  }

  const handleUpdateJob = (updatedJob: Job): void => {
    setJobs((prev) => prev.map((j) => (j.id === updatedJob.id ? updatedJob : j)))
  }

  const handleDeleteJob = (id: number): void => {
    setJobs((prev) => prev.filter((j) => j.id !== id))
  }

  if (loading) {
    return <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>Loading work history...</div>
  }

  const ghostButtonStyle = (isHovered: boolean): React.CSSProperties => ({
    backgroundColor: 'transparent',
    border: 'none',
    color: isHovered ? 'var(--color-text-secondary)' : 'var(--color-text-tertiary)',
    padding: '4px 8px',
    fontSize: 'var(--font-size-xs)',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    fontFamily: 'var(--font-sans)',
    transition: 'color 0.15s',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Add Job button */}
      {!adding && (
        <div>
          <button
            onClick={() => setAdding(true)}
            onMouseEnter={() => setAddHovered(true)}
            onMouseLeave={() => setAddHovered(false)}
            style={ghostButtonStyle(addHovered)}
          >
            + Add Job
          </button>
        </div>
      )}

      {/* Inline add form */}
      {adding && (
        <JobAddForm onSave={handleAddJob} onCancel={() => setAdding(false)} />
      )}

      {/* Job list */}
      {jobs.length === 0 && !adding ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-8) 0' }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-3)' }}>
            No work history yet. Add your first job to get started.
          </p>
          <button
            onClick={() => setAdding(true)}
            onMouseEnter={() => setEmptyAddHovered(true)}
            onMouseLeave={() => setEmptyAddHovered(false)}
            style={ghostButtonStyle(emptyAddHovered)}
          >
            + Add Job
          </button>
        </div>
      ) : (
        jobs.map((job) => (
          <JobItem
            key={job.id}
            job={job}
            onUpdate={handleUpdateJob}
            onDelete={handleDeleteJob}
          />
        ))
      )}
    </div>
  )
}

export default JobList
