import { cookieUser } from '../../utils/auth';
import { memberOnboarding } from '../../utils/share';
export default defineEventHandler(async event => {
  const user = cookieUser(event);
  if (!user) throw createError({ statusCode: event.context.desktopUser ? 403 : 401, statusMessage: 'sign_in_required' });
  const body = await readBody(event);
  return memberOnboarding(user.id, String(body?.country || '').toUpperCase(), '/payouts');
});
