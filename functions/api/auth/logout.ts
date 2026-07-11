import { jsonResponse } from '../../utils'

export const onRequestPost: PagesFunction = async () => {
  const response = jsonResponse({ success: true })
  response.headers.set('Set-Cookie', 'auth_token=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0')
  return response
}
