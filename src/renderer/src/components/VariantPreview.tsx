import { useEffect, useState } from 'react'
import { BuilderData, Profile } from '../../../preload/index.d'
import ProfessionalLayout from './ProfessionalLayout'

interface VariantPreviewProps {
  variantId: number
  layoutTemplate?: string
  refreshKey?: number
}

function isBuiltIn(layoutTemplate: string | undefined): boolean {
  return !layoutTemplate || layoutTemplate === 'professional' || layoutTemplate === 'traditional'
}

function VariantPreview({ variantId, layoutTemplate, refreshKey }: VariantPreviewProps): React.JSX.Element {
  const [builderData, setBuilderData] = useState<BuilderData | null>(null)
  const [profileData, setProfileData] = useState<Profile | null>(null)
  const [themeHtml, setThemeHtml] = useState<string | null>(null)
  const [themeLoading, setThemeLoading] = useState(false)

  // Load builder data + profile for the built-in layout
  useEffect(() => {
    setBuilderData(null)
    Promise.all([
      window.api.templates.getBuilderData(variantId),
      window.api.profile.get(),
    ]).then(([builder, profile]) => {
      setBuilderData(builder)
      setProfileData(profile)
    })
  }, [variantId, refreshKey])

  // Load theme HTML when using a non-built-in theme
  useEffect(() => {
    if (isBuiltIn(layoutTemplate)) {
      setThemeHtml(null)
      return
    }
    setThemeLoading(true)
    setThemeHtml(null)
    window.api.themes.renderHtml(variantId, layoutTemplate!).then((result) => {
      if (typeof result === 'string') {
        setThemeHtml(result)
      } else {
        // Error from handler — show error message
        setThemeHtml(`<html><body style="font-family:sans-serif;padding:2rem;color:#ef4444">
          <h2>Theme render error</h2><p>${result.error}</p>
        </body></html>`)
      }
      setThemeLoading(false)
    })
  }, [variantId, layoutTemplate, refreshKey])

  if (!isBuiltIn(layoutTemplate)) {
    // Theme iframe path
    if (themeLoading || themeHtml === null) {
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
          Loading theme...
        </div>
      )
    }
    return (
      <iframe
        srcDoc={themeHtml}
        style={{ width: '100%', height: '100%', border: 'none' }}
        sandbox="allow-same-origin allow-scripts"
      />
    )
  }

  // Built-in ProfessionalLayout path
  if (!builderData) {
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

  return (
    <div style={{ overflowY: 'auto', height: '100%' }}>
      <ProfessionalLayout
        profile={profileData ?? undefined}
        jobs={builderData.jobs}
        skills={builderData.skills}
        projects={builderData.projects}
        education={builderData.education}
        volunteer={builderData.volunteer}
        awards={builderData.awards}
        publications={builderData.publications}
        languages={builderData.languages}
        interests={builderData.interests}
        references={builderData.references}
      />
    </div>
  )
}

export default VariantPreview
