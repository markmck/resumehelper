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
    return <div className="text-zinc-500 text-sm">Loading work history...</div>
  }

  return (
    <div>
      {/* Add Job button — always visible at top */}
      {!adding && (
        <button
          onClick={() => setAdding(true)}
          className="mb-5 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs rounded transition-colors"
        >
          + Add Job
        </button>
      )}

      {/* Inline add form */}
      {adding && (
        <JobAddForm onSave={handleAddJob} onCancel={() => setAdding(false)} />
      )}

      {/* Job list */}
      {jobs.length === 0 && !adding ? (
        <div className="text-center py-8">
          <p className="text-zinc-500 text-sm mb-3">
            No work history yet. Add your first job to get started.
          </p>
          <button
            onClick={() => setAdding(true)}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded transition-colors"
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
