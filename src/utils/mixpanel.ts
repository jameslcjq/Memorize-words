/**
 * 埋点上报已出于隐私考虑移除。
 *
 * 本项目为私人使用（给孩子背单词），上游 qwerty-learner 原本会把每一次
 * 单词 / 章节 / 分享等行为通过第三方 Mixpanel 项目上报到原作者账户。
 * 这里保留同名的空实现，使各处调用点无需改动即可继续编译，同时不再向
 * 任何第三方发送数据。
 */
import type { TypingState } from '@/pages/Typing/store/type'
import type { InfoPanelType } from '@/typings'
import { useCallback } from 'react'

export type starAction = 'star' | 'dismiss'
export function recordStarAction(_action: starAction) {
  /* 埋点已移除，空实现 */
}

export type openInfoPanelLocation = 'footer' | 'resultScreen'
export function recordOpenInfoPanelAction(_type: InfoPanelType, _location: openInfoPanelLocation) {
  /* 埋点已移除，空实现 */
}

export type shareType = 'open' | 'download'
export function recordShareAction(_type: shareType) {
  /* 埋点已移除，空实现 */
}

export type analysisType = 'open'
export function recordAnalysisAction(_type: analysisType) {
  /* 埋点已移除，空实现 */
}

export type errorBookType = 'open' | 'detail'
export function recordErrorBookAction(_type: errorBookType) {
  /* 埋点已移除，空实现 */
}

export function useMixPanelWordLogUploader(_typingState: TypingState) {
  return useCallback(
    (_wordLog: { headword: string; timeStart: string; timeEnd: string; countInput: number; countCorrect: number; countTypo: number }) => {
      /* 埋点已移除，空实现 */
    },
    [],
  )
}

export function useMixPanelChapterLogUploader(_typingState: TypingState) {
  return useCallback(() => {
    /* 埋点已移除，空实现 */
  }, [])
}

export function recordDataAction(_props: { type: 'export' | 'import'; size: number; wordCount: number; chapterCount: number }) {
  /* 埋点已移除，空实现 */
}

export function getUtcStringForMixpanel() {
  const now = new Date()
  const isoString = now.toISOString()
  const utcString = isoString.substring(0, 19).replace('T', ' ')

  return utcString
}
