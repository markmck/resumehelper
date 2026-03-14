import { registerJobHandlers } from './jobs'
import { registerBulletHandlers } from './bullets'
import { registerSkillHandlers } from './skills'
import { registerTemplateHandlers } from './templates'
import { registerSubmissionHandlers } from './submissions'

export function registerAllHandlers(): void {
  registerJobHandlers()
  registerBulletHandlers()
  registerSkillHandlers()
  registerTemplateHandlers()
  registerSubmissionHandlers()
}
