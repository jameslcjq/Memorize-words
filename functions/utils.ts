export interface Env {
  DB: D1Database
  JWT_SECRET?: string
  ADMIN_USER_IDS?: string
  ADMIN_USERNAMES?: string
}

export type JwtPayload = {
  sub: string
  username?: string
  iat?: number
  exp?: number
}

export const LEGACY_PASSWORD_SALT = 'random_salt_fixed_for_now'

// Simple response helper
export const jsonResponse = <T>(data: T, status = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
    },
  })
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function stringToBase64Url(value: string): string {
  return bytesToBase64Url(new TextEncoder().encode(value))
}

function base64UrlToString(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

async function constantTimeEqual(provided: string, expected: string): Promise<boolean> {
  const enc = new TextEncoder()
  const [providedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(provided)),
    crypto.subtle.digest('SHA-256', enc.encode(expected)),
  ])
  const providedBytes = new Uint8Array(providedHash)
  const expectedBytes = new Uint8Array(expectedHash)
  let diff = 0
  for (let i = 0; i < providedBytes.length; i++) {
    diff |= providedBytes[i] ^ expectedBytes[i]
  }
  return diff === 0
}

export function generatePasswordSalt(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return bytesToBase64Url(bytes)
}

// Password Hashing (PBKDF2)
export async function hashPassword(password: string, salt: string = LEGACY_PASSWORD_SALT): Promise<string> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits', 'deriveKey'])
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(salt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  )
  const exported = await crypto.subtle.exportKey('raw', key)
  return btoa(String.fromCharCode(...new Uint8Array(exported)))
}

// JWT Implementation
async function sign(message: string, secret: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(message))
  return bytesToBase64Url(new Uint8Array(signature))
}

export async function createJwt(payload: JwtPayload, secret: string, expiresInSeconds = 60 * 60 * 24 * 30): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'HS256', typ: 'JWT' }
  const encodedHeader = stringToBase64Url(JSON.stringify(header))
  const encodedPayload = stringToBase64Url(JSON.stringify({ ...payload, iat: payload.iat || now, exp: payload.exp || now + expiresInSeconds }))
  const signature = await sign(`${encodedHeader}.${encodedPayload}`, secret)
  return `${encodedHeader}.${encodedPayload}.${signature}`
}

export async function verifyJwt(token: string, secret: string): Promise<JwtPayload> {
  const [header, payload, signature] = token.split('.')
  if (!header || !payload || !signature) throw new Error('Invalid token')

  const expectedSignature = await sign(`${header}.${payload}`, secret)
  if (!(await constantTimeEqual(signature, expectedSignature))) throw new Error('Invalid signature')

  const parsed = JSON.parse(base64UrlToString(payload)) as JwtPayload
  if (parsed.exp && parsed.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired')
  }

  return parsed
}
