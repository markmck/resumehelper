import { registerJobHandlers } from './jobs'
import { registerBulletHandlers } from './bullets'
import { registerSkillHandlers } from './skills'
import { registerTemplateHandlers } from './templates'
import { registerSubmissionHandlers } from './submissions'
import { registerProfileHandlers } from './profile'
import { registerExportHandlers } from './export'

export function registerAllHandlers(): void {
  registerJobHandlers()
  registerBulletHandlers()
  registerSkillHandlers()
  registerTemplateHandlers()
  registerSubmissionHandlers()
  registerProfileHandlers()
  registerExportHandlers()
}
