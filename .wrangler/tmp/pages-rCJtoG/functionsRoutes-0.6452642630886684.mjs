import { onRequest as __api_admin__middleware_ts_onRequest } from 'E:\\Memorize-words\\functions\\api\\admin\\_middleware.ts'
import { onRequestGet as __api_admin_stats_ts_onRequestGet } from 'E:\\Memorize-words\\functions\\api\\admin\\stats.ts'
import { onRequestGet as __api_admin_users_ts_onRequestGet } from 'E:\\Memorize-words\\functions\\api\\admin\\users.ts'
import { onRequestPost as __api_auth_login_ts_onRequestPost } from 'E:\\Memorize-words\\functions\\api\\auth\\login.ts'
import { onRequestGet as __api_sync_download_ts_onRequestGet } from 'E:\\Memorize-words\\functions\\api\\sync\\download.ts'
import { onRequestPost as __api_sync_upload_ts_onRequestPost } from 'E:\\Memorize-words\\functions\\api\\sync\\upload.ts'

export const routes = [
  {
    routePath: '/api/admin/stats',
    mountPath: '/api/admin',
    method: 'GET',
    middlewares: [],
    modules: [__api_admin_stats_ts_onRequestGet],
  },
  {
    routePath: '/api/admin/users',
    mountPath: '/api/admin',
    method: 'GET',
    middlewares: [],
    modules: [__api_admin_users_ts_onRequestGet],
  },
  {
    routePath: '/api/auth/login',
    mountPath: '/api/auth',
    method: 'POST',
    middlewares: [],
    modules: [__api_auth_login_ts_onRequestPost],
  },
  {
    routePath: '/api/sync/download',
    mountPath: '/api/sync',
    method: 'GET',
    middlewares: [],
    modules: [__api_sync_download_ts_onRequestGet],
  },
  {
    routePath: '/api/sync/upload',
    mountPath: '/api/sync',
    method: 'POST',
    middlewares: [],
    modules: [__api_sync_upload_ts_onRequestPost],
  },
  {
    routePath: '/api/admin',
    mountPath: '/api/admin',
    method: '',
    middlewares: [__api_admin__middleware_ts_onRequest],
    modules: [],
  },
]
