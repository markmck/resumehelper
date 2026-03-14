import { useEffect, useState } from 'react'
import { useToast } from './Toast'

interface ProfileForm {
  name: string
  email: string
  phone: string
  location: string
  linkedin: string
}

const EMPTY_FORM: ProfileForm = {
  name: '',
  email: '',
  phone: '',
  location: '',
  linkedin: '',
}

function ProfileSettings(): React.JSX.Element {
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()

  useEffect(() => {
    window.api.profile.get().then((data) => {
      setForm({
        name: data.name,
        email: data.email,
        phone: data.phone,
        location: data.location,
        linkedin: data.linkedin,
      })
      setLoading(false)
    })
  }, [])

  const handleChange = (field: keyof ProfileForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleSave = async (): Promise<void> => {
    await window.api.profile.set(form)
    showToast('Profile saved')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
        Loading...
      </div>
    )
  }

  const fields: { key: keyof ProfileForm; label: string; placeholder: string }[] = [
    { key: 'name', label: 'Full Name', placeholder: 'Jane Doe' },
    { key: 'email', label: 'Email', placeholder: 'jane@example.com' },
    { key: 'phone', label: 'Phone', placeholder: '+1 (555) 000-0000' },
    { key: 'location', label: 'Location', placeholder: 'San Francisco, CA' },
    { key: 'linkedin', label: 'LinkedIn URL', placeholder: 'linkedin.com/in/janedoe' },
  ]

  return (
    <div
      style={{
        maxWidth: '480px',
        margin: '0 auto',
        padding: '2rem 1.5rem',
      }}
    >
      <h1
        style={{
          fontSize: '1.125rem',
          fontWeight: '600',
          color: '#f4f4f5',
          marginBottom: '1.5rem',
        }}
      >
        Profile
      </h1>
      <p
        style={{
          fontSize: '0.8125rem',
          color: '#71717a',
          marginBottom: '1.5rem',
          lineHeight: '1.5',
        }}
      >
        Your profile information appears in the resume header when exporting to PDF or DOCX.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {fields.map(({ key, label, placeholder }) => (
          <div key={key}>
            <label
              htmlFor={`profile-${key}`}
              style={{
                display: 'block',
                fontSize: '0.8125rem',
                fontWeight: '500',
                color: '#a1a1aa',
                marginBottom: '0.375rem',
              }}
            >
              {label}
            </label>
            <input
              id={`profile-${key}`}
              type="text"
              value={form[key]}
              onChange={handleChange(key)}
              placeholder={placeholder}
              className="bg-zinc-800 border border-zinc-700 rounded text-zinc-100 px-3 py-2 text-sm w-full focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
            />
          </div>
        ))}
      </div>

      <div style={{ marginTop: '1.5rem' }}>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-md transition-colors"
        >
          Save
        </button>
      </div>
    </div>
  )
}

export default ProfileSettings
