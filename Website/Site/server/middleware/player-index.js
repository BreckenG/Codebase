export default defineEventHandler(event => {
  const path = event.path.split('?')[0];
  if (path === '/player' || path === '/player/') return sendRedirect(event, '/leaderboard', 301);
});
