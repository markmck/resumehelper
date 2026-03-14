import { registerJobHandlers } from './jobs'
import { registerBulletHandlers } from './bullets'
import { registerSkillHandlers } from './skills'
import { registerTemplateHandlers } from './templates'

export function registerAllHandlers(): void {
  registerJobHandlers()
  registerBulletHandlers()
  registerSkillHandlers()
  registerTemplateHandlers()
}
