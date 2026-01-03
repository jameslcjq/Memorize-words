export const onRequest: PagesFunction = async (context) => {
  const { request, next } = context

  // Simple "Hardcoded" Admin Password for personal use
  // In production, use env.ADMIN_PASSWORD
  const ADMIN_PASSWORD = 'admin' // User asked for simple admin123, I'll use 'admin' as simpler default or sticking to plan? Plan said admin123. Let's stick to plan.

  // Actually, plan said 'admin123'.
  const CORRECT_PASSWORD = 'admin123'

  const authHeader = request.headers.get('x-admin-password')

  if (authHeader !== CORRECT_PASSWORD) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return next()
}
