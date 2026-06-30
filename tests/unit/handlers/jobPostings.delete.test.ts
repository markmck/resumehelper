import { describe, it, expect } from 'vitest'
import { createTestDb } from '../../helpers/db'
import { seedJobPosting, seedAnalysis } from '../../helpers/factories'
import { deleteJobPosting } from '../../../src/main/handlers/jobPostings'
import * as schema from '../../../src/main/db/schema'

describe('deleteJobPosting', () => {
  it('deletes the posting and its analyses while nulling referencing submissions', async () => {
    const db = createTestDb()
    const posting = seedJobPosting(db)
    const analysis = seedAnalysis(db, posting.id)
    // A logged submission references both the posting and the analysis via
    // ON DELETE NO ACTION FKs — these would block the delete without nulling first.
    db.insert(schema.submissions)
      .values({
        company: 'ACME Corp',
        role: 'Software Engineer',
        jobPostingId: posting.id,
        analysisId: analysis.id,
        resumeSnapshot: '{}',
      })
      .run()

    const result = await deleteJobPosting(db, posting.id)
    expect(result).toEqual({ success: true })

    // Posting and its cascade-removed analyses are gone.
    expect(db.select().from(schema.jobPostings).all()).toHaveLength(0)
    expect(db.select().from(schema.analysisResults).all()).toHaveLength(0)

    // Submission row is preserved with both back-references nulled.
    const subs = db.select().from(schema.submissions).all()
    expect(subs).toHaveLength(1)
    expect(subs[0].jobPostingId).toBeNull()
    expect(subs[0].analysisId).toBeNull()
  })
})
