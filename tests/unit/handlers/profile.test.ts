import { describe, it, expect } from 'vitest'
import { createTestDb } from '../../helpers/db'
import { getProfile, setProfile } from '../../../src/main/handlers/profile'

describe('profile handler', () => {
  it('getProfile returns sentinel row with empty strings on fresh DB', () => {
    const db = createTestDb()
    const result = getProfile(db)
    expect(result).toMatchObject({
      id: 1,
      name: '',
      email: '',
      phone: '',
      location: '',
      linkedin: '',
      summary: '',
    })
  })

  it('setProfile upserts data and returns updated profile', () => {
    const db = createTestDb()
    const data = {
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '555-1234',
      location: 'Seattle, WA',
      linkedin: 'linkedin.com/in/jane',
      summary: 'Software engineer',
    }
    const result = setProfile(db, data)
    expect(result).toMatchObject({ id: 1, ...data })
  })

  it('setProfile overwrites previous values on second call', () => {
    const db = createTestDb()
    const first = {
      name: 'First Name',
      email: 'first@example.com',
      phone: '111-1111',
      location: 'Portland',
      linkedin: 'linkedin.com/in/first',
      summary: 'First summary',
    }
    const second = {
      name: 'Second Name',
      email: 'second@example.com',
      phone: '222-2222',
      location: 'Seattle',
      linkedin: 'linkedin.com/in/second',
      summary: 'Second summary',
    }
    setProfile(db, first)
    const result = setProfile(db, second)
    expect(result).toMatchObject({ id: 1, ...second })
    expect(result.name).toBe('Second Name')
  })
})
