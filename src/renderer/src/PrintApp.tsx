import { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import ProfessionalLayout from './components/ProfessionalLayout'
import { BuilderJob, BuilderSkill, Profile } from '../../preload/index.d'

interface PrintData {
  profile: Profile
  jobs: BuilderJob[]
  skills: BuilderSkill[]
}

function PrintApp(): React.JSX.Element {
  const [data, setData] = useState<PrintData | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const variantId = Number(params.get('variantId'))

    Promise.all([window.api.profile.get(), window.api.templates.getBuilderData(variantId)]).then(
      ([profileData, builderData]) => {
        setData({ profile: profileData, jobs: builderData.jobs, skills: builderData.skills })
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
    />
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(<PrintApp />)

export default PrintApp
