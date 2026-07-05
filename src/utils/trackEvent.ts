/**
 * 推广/运营事件上报已出于隐私考虑移除。
 *
 * 原实现会把事件同时发送到 Vercel Analytics 和 Google Analytics(gtag)。
 * 这里保留同名空实现，调用点无需改动，且不再向任何第三方发送数据。
 */
export const trackPromotionEvent = (_event: string, _properties: Record<string, string>) => {
  /* 埋点已移除，空实现 */
}
