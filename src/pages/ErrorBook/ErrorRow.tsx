import { LoadingWordUI } from './LoadingWordUI'
import useGetWord from './hooks/useGetWord'
import { currentRowDetailAtom } from './store'
import type { groupedWordRecords } from './type'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { idDictionaryMap } from '@/resources/dictionary'
import { recordErrorBookAction } from '@/utils'
import { useSetAtom } from 'jotai'
import type { FC } from 'react'
import { useCallback } from 'react'
import DeleteIcon from '~icons/weui/delete-filled'

type IErrorRowProps = {
  record: groupedWordRecords
  onDelete: () => void
}

const ErrorRow: FC<IErrorRowProps> = ({ record, onDelete }) => {
  const setCurrentRowDetail = useSetAtom(currentRowDetailAtom)
  const dictInfo = idDictionaryMap[record.dict]
  const { word, isLoading, hasError } = useGetWord(record.word, dictInfo)

  const onClick = useCallback(() => {
    setCurrentRowDetail(record)
    recordErrorBookAction('detail')
  }, [record, setCurrentRowDetail])

  return (
    <li
      className="opacity-85 flex w-full cursor-pointer items-center justify-between rounded-lg bg-white px-4 py-3 text-black shadow-md dark:bg-gray-800 dark:text-white md:px-6"
      onClick={onClick}
    >
      <span className="basis-3/12 break-normal md:basis-2/12">{record.word}</span>
      <span className="basis-5/12 break-normal md:basis-6/12">
        {word ? word.trans.join('；') : <LoadingWordUI isLoading={isLoading} hasError={hasError} />}
      </span>
      <span className="basis-2/12 break-normal pl-4 md:basis-1/12 md:pl-8">{record.wrongCount}</span>
      <span className="hidden basis-1/12 break-normal md:block">{dictInfo?.name}</span>
      <span
        className="basis-1/12 break-normal"
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <DeleteIcon />
            </TooltipTrigger>
            <TooltipContent>
              <p>Delete Records</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </span>
    </li>
  )
}

export default ErrorRow
