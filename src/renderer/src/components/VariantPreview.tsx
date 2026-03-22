import { useEffect, useState } from 'react'
import { BuilderData, Profile } from '../../../preload/index.d'
import ProfessionalLayout from './ProfessionalLayout'

interface VariantPreviewProps {
  variantId: number
}

function VariantPreview({ variantId }: VariantPreviewProps): React.JSX.Element {
  const [builderData, setBuilderData] = useState<BuilderData | null>(null)
  const [profileData, setProfileData] = useState<Profile | null>(null)

  useEffect(() => {
    setBuilderData(null)
    Promise.all([
      window.api.templates.getBuilderData(variantId),
      window.api.profile.get(),
    ]).then(([builder, profile]) => {
      setBuilderData(builder)
      setProfileData(profile)
    })
  }, [variantId])

  if (!builderData) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
        Loading...
      </div>
    )
  }

  return (
    <div className="overflow-y-auto h-full">
      <ProfessionalLayout
        profile={profileData ?? undefined}
        jobs={builderData.jobs}
        skills={builderData.skills}
        projects={builderData.projects}
      />
    </div>
  )
}

export default VariantPreview
