import DropdownExport from './DropdownExport'
import ErrorRow from './ErrorRow'
import type { ISortType } from './HeadWrongNumber'
import HeadWrongNumber from './HeadWrongNumber'
import Pagination, { ITEM_PER_PAGE } from './Pagination'
import RowDetail from './RowDetail'
import { currentRowDetailAtom } from './store'
import type { groupedWordRecords } from './type'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { userInfoAtom } from '@/store'
import { db, useDeleteWordRecord } from '@/utils/db'
import type { WordRecord } from '@/utils/db/record'
import * as ScrollArea from '@radix-ui/react-scroll-area'
import { useAtomValue } from 'jotai'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import IconX from '~icons/tabler/x'

type DeleteTarget = { word: string; dict: string }

const getRecordKey = (record: DeleteTarget) => `${record.dict}::${record.word}`

export function ErrorBook() {
  const [groupedRecords, setGroupedRecords] = useState<groupedWordRecords[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const totalPages = useMemo(() => Math.ceil(groupedRecords.length / ITEM_PER_PAGE), [groupedRecords.length])
  const [sortType, setSortType] = useState<ISortType>('asc')
  const navigate = useNavigate()
  const currentRowDetail = useAtomValue(currentRowDetailAtom)
  const { deleteWordRecord } = useDeleteWordRecord()
  const [reload, setReload] = useState(false)
  const userInfo = useAtomValue(userInfoAtom)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set())
  const pendingDeleteRef = useRef<DeleteTarget[]>([])
  const passwordInputRef = useRef<HTMLInputElement>(null)

  const onBack = useCallback(() => {
    navigate('/')
  }, [navigate])

  const setPage = useCallback(
    (page: number) => {
      if (page < 1 || page > totalPages) return
      setCurrentPage(page)
    },
    [totalPages],
  )

  const setSort = useCallback(
    (sortType: ISortType) => {
      setSortType(sortType)
      setPage(1)
    },
    [setPage],
  )

  const sortedRecords = useMemo(() => {
    if (sortType === 'none') return groupedRecords
    return [...groupedRecords].sort((a, b) => {
      if (sortType === 'asc') {
        return a.wrongCount - b.wrongCount
      } else {
        return b.wrongCount - a.wrongCount
      }
    })
  }, [groupedRecords, sortType])

  const renderRecords = useMemo(() => {
    const start = (currentPage - 1) * ITEM_PER_PAGE
    const end = start + ITEM_PER_PAGE
    return sortedRecords.slice(start, end)
  }, [currentPage, sortedRecords])

  const selectedRecords = useMemo(() => {
    return sortedRecords.filter((record) => selectedKeys.has(getRecordKey(record)))
  }, [selectedKeys, sortedRecords])

  const isCurrentPageAllSelected = useMemo(() => {
    return renderRecords.length > 0 && renderRecords.every((record) => selectedKeys.has(getRecordKey(record)))
  }, [renderRecords, selectedKeys])

  const toggleRecordSelection = useCallback((record: DeleteTarget) => {
    const key = getRecordKey(record)
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }, [])

  const toggleCurrentPageSelection = useCallback(() => {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (isCurrentPageAllSelected) {
        renderRecords.forEach((record) => next.delete(getRecordKey(record)))
      } else {
        renderRecords.forEach((record) => next.add(getRecordKey(record)))
      }
      return next
    })
  }, [isCurrentPageAllSelected, renderRecords])

  useEffect(() => {
    db.wordRecords
      .where('wrongCount')
      .above(0)
      .toArray()
      .then((records) => {
        const groups: groupedWordRecords[] = []

        records.forEach((record) => {
          let group = groups.find((g) => g.word === record.word && g.dict === record.dict)
          if (!group) {
            group = { word: record.word, dict: record.dict, records: [], wrongCount: 0 }
            groups.push(group)
          }
          group.records.push(record as WordRecord)
        })

        groups.forEach((group) => {
          group.wrongCount = group.records.reduce((acc, cur) => {
            acc += cur.wrongCount
            return acc
          }, 0)
        })

        setGroupedRecords(groups)
      })
  }, [reload])

  useEffect(() => {
    setSelectedKeys((prev) => {
      const availableKeys = new Set(groupedRecords.map(getRecordKey))
      const next = new Set([...prev].filter((key) => availableKeys.has(key)))
      return next.size === prev.size ? prev : next
    })
  }, [groupedRecords])

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const deleteTargets = useCallback(
    async (targets: DeleteTarget[]) => {
      const uniqueTargets = Array.from(new Map(targets.map((target) => [getRecordKey(target), target])).values())
      for (const target of uniqueTargets) {
        await deleteWordRecord(target.word, target.dict)
      }
      setSelectedKeys(new Set())
      setReload((prev) => !prev)
    },
    [deleteWordRecord],
  )

  const requestDeleteTargets = useCallback(
    async (targets: DeleteTarget[]) => {
      if (targets.length === 0) return

      if (userInfo) {
        pendingDeleteRef.current = targets
        setPasswordInput('')
        setPasswordError('')
        setShowPasswordDialog(true)
        setTimeout(() => passwordInputRef.current?.focus(), 100)
        return
      }

      await deleteTargets(targets)
    },
    [deleteTargets, userInfo],
  )

  const handleDelete = async (word: string, dict: string) => {
    await requestDeleteTargets([{ word, dict }])
  }

  const handleBatchDelete = async () => {
    if (selectedRecords.length === 0) return
    if (!confirm(`确定要删除选中的 ${selectedRecords.length} 个错题吗？`)) return
    await requestDeleteTargets(selectedRecords)
  }

  const handleClearAll = async () => {
    if (sortedRecords.length === 0) return
    if (!confirm(`确定要清空全部 ${sortedRecords.length} 个错题吗？此操作不可撤销。`)) return
    await requestDeleteTargets(sortedRecords)
  }

  const handlePasswordConfirm = async () => {
    if (!passwordInput) {
      setPasswordError('请输入密码')
      return
    }
    if (!userInfo) return

    setIsVerifying(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: userInfo.username, password: passwordInput }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        setPasswordError('密码错误，请重试')
        return
      }

      // Password verified, proceed with deletion
      if (pendingDeleteRef.current.length > 0) {
        await deleteTargets(pendingDeleteRef.current)
        pendingDeleteRef.current = []
        setShowPasswordDialog(false)
      }
    } catch {
      setPasswordError('验证失败，请检查网络连接')
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <>
      <div className={`relative flex h-screen w-full flex-col items-center pb-4 ease-in ${currentRowDetail && 'blur-sm'}`}>
        <div className="mr-8 mt-4 flex w-auto items-center justify-center self-end">
          <h1 className="font-lighter mr-4 w-auto self-end text-gray-500 opacity-70">Tip: 点击错误单词查看详细信息 </h1>
          <IconX className="h-7 w-7 cursor-pointer text-gray-400" onClick={onBack} />
        </div>

        <div className="flex w-full flex-1 select-text items-start justify-center overflow-hidden px-4">
          <div className="flex h-full w-full max-w-6xl flex-col pt-10">
            <div className="flex w-full justify-between rounded-lg bg-white px-4 py-5 text-base text-black shadow-lg dark:bg-gray-800 dark:text-white md:px-6 md:text-lg">
              <span className="basis-1/12">
                <input
                  type="checkbox"
                  checked={isCurrentPageAllSelected}
                  onChange={toggleCurrentPageSelection}
                  className="h-4 w-4 cursor-pointer rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  aria-label="选择本页错题"
                />
              </span>
              <span className="basis-3/12 md:basis-2/12">单词</span>
              <span className="basis-5/12 md:basis-6/12">释义</span>
              <HeadWrongNumber className="basis-2/12 md:basis-1/12" sortType={sortType} setSortType={setSort} />
              <span className="hidden basis-1/12 md:block">词典</span>
              <div className="flex basis-2/12 items-center justify-end gap-2">
                {selectedRecords.length > 0 && (
                  <button
                    type="button"
                    onClick={handleBatchDelete}
                    className="rounded bg-red-500 px-3 py-1 text-sm text-white hover:bg-red-600"
                  >
                    删除选中({selectedRecords.length})
                  </button>
                )}
                {sortedRecords.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="rounded border border-red-300 px-3 py-1 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                  >
                    清空
                  </button>
                )}
                <DropdownExport renderRecords={sortedRecords} />
              </div>
            </div>
            <ScrollArea.Root className="flex-1 overflow-y-auto pt-5">
              <ScrollArea.Viewport className="h-full  ">
                <div className="flex flex-col gap-3">
                  {renderRecords.length > 0 ? (
                    renderRecords.map((record) => (
                      <ErrorRow
                        key={`${record.dict}-${record.word}`}
                        record={record}
                        isSelected={selectedKeys.has(getRecordKey(record))}
                        onToggleSelect={() => toggleRecordSelection(record)}
                        onDelete={() => handleDelete(record.word, record.dict)}
                      />
                    ))
                  ) : (
                    <div className="rounded-lg bg-white py-12 text-center text-gray-500 shadow-md dark:bg-gray-800 dark:text-gray-400">
                      暂无错题记录
                    </div>
                  )}
                </div>
              </ScrollArea.Viewport>
              <ScrollArea.Scrollbar className="flex touch-none select-none bg-transparent" orientation="vertical"></ScrollArea.Scrollbar>
            </ScrollArea.Root>
          </div>
        </div>
        <Pagination className="pt-3" page={currentPage} setPage={setPage} totalPages={totalPages} />
      </div>
      {currentRowDetail && <RowDetail currentRowDetail={currentRowDetail} allRecords={sortedRecords} />}

      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>删除确认</DialogTitle>
            <DialogDescription>
              请输入账号 <span className="font-medium text-gray-700 dark:text-gray-300">{userInfo?.username}</span>{' '}
              的密码以删除 {pendingDeleteRef.current.length || 1} 个错题记录
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <input
              ref={passwordInputRef}
              type="password"
              value={passwordInput}
              onChange={(e) => {
                setPasswordInput(e.target.value)
                setPasswordError('')
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handlePasswordConfirm()
              }}
              placeholder="请输入登录密码"
              className={`w-full rounded border px-3 py-2 text-sm dark:bg-gray-700 ${
                passwordError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {passwordError && <p className="mt-1 text-xs text-red-500">{passwordError}</p>}
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setShowPasswordDialog(false)}
              className="rounded px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handlePasswordConfirm}
              disabled={isVerifying}
              className="rounded bg-red-500 px-4 py-2 text-sm text-white hover:bg-red-600 disabled:opacity-50"
            >
              {isVerifying ? '验证中...' : '确认删除'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
