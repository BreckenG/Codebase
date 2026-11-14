import { currentUser } from '../../utils/auth'
import { recordAcceptance } from '../../utils/consent'
import { POLICY_VERSION } from '../../../app/utils/legal.js'
export default defineEventHandler(async event => {
  const user = currentUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Sign in first.' })
  const body = await readBody(event)
  if (body?.accepted !== true || body?.policyVersion !== POLICY_VERSION) throw createError({ statusCode: 400, statusMessage: 'Reload the page to see the current terms.' })
  await recordAcceptance(user.id, 'account')
  return { agreed: true, version: POLICY_VERSION }
})
