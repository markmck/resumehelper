import { useEffect, useState } from 'react'
import { useToast } from './Toast'

interface ProfileForm {
  name: string
  email: string
  phone: string
  location: string
  linkedin: string
  summary: string
}

const EMPTY_FORM: ProfileForm = {
  name: '',
  email: '',
  phone: '',
  location: '',
  linkedin: '',
  summary: '',
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
        summary: data.summary ?? '',
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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: 'var(--color-text-tertiary)',
          fontSize: 'var(--font-size-sm)',
        }}
      >
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
        padding: 'var(--space-8) var(--space-6)',
      }}
    >
      <h2
        style={{
          fontSize: 'var(--font-size-lg)',
          fontWeight: 500,
          color: 'var(--color-text-primary)',
          marginBottom: 'var(--space-2)',
          marginTop: 0,
        }}
      >
        Profile
      </h2>
      <p
        style={{
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-tertiary)',
          marginBottom: 'var(--space-6)',
          marginTop: 0,
          lineHeight: 1.5,
        }}
      >
        Your profile information appears in the resume header when exporting to PDF or DOCX.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {fields.map(({ key, label, placeholder }) => (
          <div key={key}>
            <label
              htmlFor={`profile-${key}`}
              style={{
                display: 'block',
                fontSize: 'var(--font-size-xs)',
                fontWeight: 500,
                textTransform: 'uppercase' as const,
                letterSpacing: '0.05em',
                color: 'var(--color-text-tertiary)',
                marginBottom: 'var(--space-2)',
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
              style={{
                backgroundColor: 'var(--color-bg-input)',
                border: '1px solid var(--color-border-default)',
                borderRadius: 'var(--radius-md)',
                padding: '8px 12px',
                height: 36,
                fontSize: 'var(--font-size-base)',
                color: 'var(--color-text-primary)',
                width: '100%',
                outline: 'none',
                fontFamily: 'var(--font-sans)',
              }}
            />
          </div>
        ))}

        {/* Summary / Objective */}
        <div>
          <label
            htmlFor="profile-summary"
            style={{
              display: 'block',
              fontSize: 'var(--font-size-xs)',
              fontWeight: 500,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.05em',
              color: 'var(--color-text-tertiary)',
              marginBottom: 'var(--space-2)',
            }}
          >
            Summary / Objective
          </label>
          <textarea
            id="profile-summary"
            value={form.summary}
            onChange={(e) => setForm((prev) => ({ ...prev, summary: e.target.value }))}
            placeholder="A brief professional summary or career objective (optional — can be toggled per variant)"
            rows={4}
            style={{
              backgroundColor: 'var(--color-bg-input)',
              border: '1px solid var(--color-border-default)',
              borderRadius: 'var(--radius-md)',
              padding: '8px 12px',
              fontSize: 'var(--font-size-base)',
              color: 'var(--color-text-primary)',
              width: '100%',
              outline: 'none',
              fontFamily: 'var(--font-sans)',
              resize: 'vertical',
              lineHeight: 1.6,
            }}
          />
        </div>
      </div>

      <div style={{ marginTop: 'var(--space-6)' }}>
        <button
          onClick={handleSave}
          style={{
            backgroundColor: 'var(--color-accent)',
            color: '#fff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--font-size-base)',
            fontWeight: 500,
            cursor: 'pointer',
            height: 36,
            fontFamily: 'var(--font-sans)',
          }}
        >
          Save
        </button>
      </div>
    </div>
  )
}

export default ProfileSettings
