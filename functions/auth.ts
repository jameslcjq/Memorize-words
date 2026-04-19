import { jsonResponse, verifyJwt } from './utils'

type AuthEnv = {
  JWT_SECRET?: string
  ADMIN_USER_IDS?: string
  ADMIN_USERNAMES?: string
}

export type AuthenticatedUser = {
  sub: string
  username?: string
}

export class HttpError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'HttpError'
    this.status = status
  }
}

export function getJwtSecret(env: AuthEnv): string {
  const secret = env.JWT_SECRET?.trim()
  if (!secret) {
    throw new HttpError('Server auth is not configured', 500)
  }

  return secret
}

function getBearerToken(request: Request): string {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new HttpError('Unauthorized', 401)
  }

  const token = authHeader.slice('Bearer '.length).trim()
  if (!token) {
    throw new HttpError('Unauthorized', 401)
  }

  return token
}

function parseConfigList(value?: string): string[] {
  return (value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

export async function requireAuth(request: Request, env: AuthEnv): Promise<AuthenticatedUser> {
  try {
    const payload = await verifyJwt(getBearerToken(request), getJwtSecret(env))
    if (!payload?.sub || typeof payload.sub !== 'string') {
      throw new HttpError('Unauthorized', 401)
    }

    return {
      sub: payload.sub,
      username: typeof payload.username === 'string' ? payload.username : undefined,
    }
  } catch (error) {
    if (error instanceof HttpError) {
      throw error
    }

    throw new HttpError('Unauthorized', 401)
  }
}

export async function requireAdmin(request: Request, env: AuthEnv): Promise<AuthenticatedUser> {
  const user = await requireAuth(request, env)
  const allowedUserIds = parseConfigList(env.ADMIN_USER_IDS)
  const allowedUsernames = parseConfigList(env.ADMIN_USERNAMES)

  if (allowedUserIds.length === 0 && allowedUsernames.length === 0) {
    throw new HttpError('Admin access is not configured', 500)
  }

  if (allowedUserIds.includes(user.sub)) {
    return user
  }

  if (user.username && allowedUsernames.includes(user.username)) {
    return user
  }

  throw new HttpError('Forbidden', 403)
}

export function errorResponse(error: unknown): Response {
  if (error instanceof HttpError) {
    return jsonResponse({ error: error.message }, error.status)
  }

  if (error instanceof Error) {
    return jsonResponse({ error: error.message }, 500)
  }

  return jsonResponse({ error: 'Internal Server Error' }, 500)
}