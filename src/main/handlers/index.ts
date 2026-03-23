import { registerJobHandlers } from './jobs'
import { registerBulletHandlers } from './bullets'
import { registerSkillHandlers } from './skills'
import { registerTemplateHandlers } from './templates'
import { registerSubmissionHandlers } from './submissions'
import { registerProfileHandlers } from './profile'
import { registerExportHandlers } from './export'
import { registerProjectHandlers } from './projects'
import { registerEducationHandlers } from './education'
import { registerVolunteerHandlers } from './volunteer'
import { registerAwardHandlers } from './awards'
import { registerPublicationHandlers } from './publications'
import { registerLanguageHandlers } from './languages'
import { registerInterestHandlers } from './interests'
import { registerReferenceHandlers } from './references'
import { registerImportHandlers } from './import'
import { registerThemeHandlers } from './themes'

export function registerAllHandlers(): void {
  registerJobHandlers()
  registerBulletHandlers()
  registerSkillHandlers()
  registerTemplateHandlers()
  registerSubmissionHandlers()
  registerProfileHandlers()
  registerExportHandlers()
  registerProjectHandlers()
  registerEducationHandlers()
  registerVolunteerHandlers()
  registerAwardHandlers()
  registerPublicationHandlers()
  registerLanguageHandlers()
  registerInterestHandlers()
  registerReferenceHandlers()
  registerImportHandlers()
  registerThemeHandlers()
}
