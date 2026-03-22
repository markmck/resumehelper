import { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import ProfessionalLayout from './components/ProfessionalLayout'
import {
  BuilderJob,
  BuilderProject,
  BuilderSkill,
  BuilderEducation,
  BuilderVolunteer,
  BuilderAward,
  BuilderPublication,
  BuilderLanguage,
  BuilderInterest,
  BuilderReference,
  Profile,
} from '../../preload/index.d'

interface PrintData {
  profile: Profile
  jobs: BuilderJob[]
  skills: BuilderSkill[]
  projects: BuilderProject[]
  education?: BuilderEducation[]
  volunteer?: BuilderVolunteer[]
  awards?: BuilderAward[]
  publications?: BuilderPublication[]
  languages?: BuilderLanguage[]
  interests?: BuilderInterest[]
  references?: BuilderReference[]
}

function PrintApp(): React.JSX.Element {
  const [data, setData] = useState<PrintData | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const variantId = Number(params.get('variantId'))

    Promise.all([window.api.profile.get(), window.api.templates.getBuilderData(variantId)]).then(
      ([profileData, builderData]) => {
        setData({
          profile: profileData,
          jobs: builderData.jobs,
          skills: builderData.skills,
          projects: builderData.projects,
          education: builderData.education,
          volunteer: builderData.volunteer,
          awards: builderData.awards,
          publications: builderData.publications,
          languages: builderData.languages,
          interests: builderData.interests,
          references: builderData.references,
        })
      }
    )
  }, [])

  useEffect(() => {
    if (data !== null) {
      // Give React one frame to paint before signalling readiness
      requestAnimationFrame(() => {
        setTimeout(() => {
          window.electron.ipcRenderer.send('print:ready')
        }, 0)
      })
    }
  }, [data])

  if (!data) {
    return <div style={{ background: 'white' }} />
  }

  return (
    <ProfessionalLayout
      profile={data.profile}
      jobs={data.jobs}
      skills={data.skills}
      projects={data.projects}
      education={data.education}
      volunteer={data.volunteer}
      awards={data.awards}
      publications={data.publications}
      languages={data.languages}
      interests={data.interests}
      references={data.references}
    />
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(<PrintApp />)

export default PrintApp
