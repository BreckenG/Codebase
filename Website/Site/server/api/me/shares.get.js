import { cookieUser } from '../../utils/auth';
import { memberView } from '../../utils/share';
export default defineEventHandler(async event => {
  const user = cookieUser(event);
  if (!user) throw createError({ statusCode: event.context.desktopUser ? 403 : 401, statusMessage: 'sign_in_required' });
  const view = await memberView(user.id);
  if (!view) throw createError({ statusCode: 404, statusMessage: 'Not found.' });
  return view;
});
