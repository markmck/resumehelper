import { registerJobHandlers } from './jobs'
import { registerBulletHandlers } from './bullets'
import { registerSkillHandlers } from './skills'

export function registerAllHandlers(): void {
  registerJobHandlers()
  registerBulletHandlers()
  registerSkillHandlers()
}
