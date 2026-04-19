import { errorResponse, requireAdmin } from '../../auth'

interface Env {
  JWT_SECRET?: string
  ADMIN_USER_IDS?: string
  ADMIN_USERNAMES?: string
}

export const onRequest: PagesFunction<Env> = async (context) => {
  try {
    await requireAdmin(context.request, context.env)
    return context.next()
  } catch (error) {
    return errorResponse(error)
  }
}
