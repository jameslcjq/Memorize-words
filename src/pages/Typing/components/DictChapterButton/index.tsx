import Tooltip from '@/components/Tooltip'
import { currentDictInfoAtom, isReviewModeAtom, selectedChaptersAtom } from '@/store'
import range from '@/utils/range'
import { Listbox, Transition } from '@headlessui/react'
import { useAtom, useAtomValue } from 'jotai'
import { Fragment, useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import IconCheck from '~icons/tabler/check'

export const DictChapterButton = () => {
  const currentDictInfo = useAtomValue(currentDictInfoAtom)
  const [selectedChapters, setSelectedChapters] = useAtom(selectedChaptersAtom)
  const chapterCount = currentDictInfo.chapterCount
  const isReviewMode = useAtomValue(isReviewModeAtom)

  const handleKeyDown: React.KeyboardEventHandler<HTMLButtonElement> = (event) => {
    if (event.key === ' ') {
      event.preventDefault()
    }
  }
  return (
    <>
      <Tooltip content="词典切换">
        <NavLink
          className="block rounded-lg px-3 py-1 text-lg text-gray-700 transition-colors duration-300 ease-in-out hover:bg-indigo-400 hover:text-white focus:outline-none dark:text-white dark:text-opacity-60 dark:hover:text-opacity-100"
          to="/gallery"
        >
          {currentDictInfo.name} {isReviewMode && '错题复习'}
        </NavLink>
      </Tooltip>
      {!isReviewMode && (
        <Tooltip content="单元切换">
          <Listbox
            value={selectedChapters}
            onChange={(selected: number[]) => {
              // Get the newly selected item (the last one added)
              // Note: This logic assumes simple clicks on options.
              // Logic:
              // - If user selects -1 (Whole Dict), clear others and keep -1.
              // - If user selects -2 (Error Book), clear others and keep -2.
              // - If user selects a regular chapter (>=0):
              //   - If -1 or -2 was previously selected, clear them and keep the new regular chapter.
              //   - If other regular chapters were selected, toggle the new one (Listbox handles toggle internally for "multiple", but we need to ensuring -1/-2 are gone).

              // Actually, headlessui Listbox 'multiple' passes the full new array.
              // We need to inspect the difference to enforce exclusivity.
              let newSelection = selected

              const hasErrorBook = newSelection.includes(-2)
              const hasWholeDict = newSelection.includes(-1)
              const hasRegular = newSelection.some((i) => i >= 0)

              // If we just added -2, it should be the last one if we appended?
              // Or we can just check if -2 is present. If it is present, and we didn't have it before, we clear others.
              // But standard Listbox 'multiple' behavior is toggle.
              // Let's implement a smarter reducer logic.

              // Check if -2 or -1 is present in the NEW selection
              // Disambiguation is tricky without knowing what was clicked.
              // Simple heuristic:
              // If we are switching TO ErrorBook/WholeDict (meaning they weren't selected before, or they are just clicked now), we should probably clear others.
              // But simpler: just enforce "If ErrorBook/WholeDict is in the list, it must be the only one" is hard if user *adds* it to existing.

              // Let's rely on checking what's new.
              // Since we don't easily know what was clicked, let's use a simplified ruleset:
              // 1. If the new selection contains -2, and the previous didn't, set to [-2].
              // 2. If the new selection contains -1, and the previous didn't, set to [-1].
              // 3. If the new selection contains regular chapters, and previous was -1 or -2, set to [new_chapter].
              // 4. If multiple regular selected, just keep them.
              // 5. If -2/ -1 is selected AND regular chapters are selected, remove -2 / -1 (assuming user wants to add chapters).

              // Wait, simpler approach:
              // If the array contains -2 or -1, and length > 1:
              //   - Did we *just* add -2? (wasn't there before). -> Keep only -2.
              //   - Did we *just* add a regular chapter? (was -2 before). -> Keep only regular.

              const prevHasErrorBook = selectedChapters.includes(-2)
              const prevHasWholeDict = selectedChapters.includes(-1)

              if (newSelection.includes(-2) && !prevHasErrorBook) {
                // User just clicked Error Book.
                newSelection = [-2]
              } else if (newSelection.includes(-1) && !prevHasWholeDict) {
                // User just clicked Whole Dict.
                newSelection = [-1]
              } else if ((prevHasErrorBook || prevHasWholeDict) && newSelection.length > 1) {
                // User was in ErrorBook/WholeDict mode, and just clicked something else (regular chapter).
                // Remove the special modes.
                newSelection = newSelection.filter((i) => i >= 0)
              } else if (newSelection.includes(-2) && newSelection.length > 1) {
                // Fallback: if somehow we have ErrorBook + others, remove ErrorBook
                newSelection = newSelection.filter((i) => i !== -2)
              } else if (newSelection.includes(-1) && newSelection.length > 1) {
                // Fallback: if somehow we have WholeDict + others, remove WholeDict
                newSelection = newSelection.filter((i) => i !== -1)
              }

              if (newSelection.length === 0) {
                // Prevent empty selection? Defaults to ch 0 or keep previous?
                // Let's allow empty? No, keep previous or default to 0.
                // If user deselects the last item.
                newSelection = [0]
              }

              // Sort strictly for cleaner display logic, though not strictly required
              newSelection.sort((a, b) => a - b)
              setSelectedChapters(newSelection)
            }}
            multiple
          >
            <Listbox.Button
              onKeyDown={handleKeyDown}
              className="rounded-lg px-3 py-1 text-lg text-gray-700 transition-colors duration-300 ease-in-out hover:bg-indigo-400 hover:text-white focus:outline-none dark:text-white dark:text-opacity-60 dark:hover:text-opacity-100"
            >
              {selectedChapters.includes(-1) && '整个词库'}
              {selectedChapters.includes(-2) && '错题本'}
              {!selectedChapters.includes(-1) &&
                !selectedChapters.includes(-2) &&
                (selectedChapters.length === 1 ? `第 ${selectedChapters[0] + 1} 单元` : `${selectedChapters.length} 个单元`)}
            </Listbox.Button>
            <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
              <Listbox.Options className="customized-scrollbar listbox-options z-10 max-h-96 w-48 overflow-y-auto">
                <Listbox.Option key={-2} value={-2}>
                  {({ selected }) => (
                    <div className="group flex cursor-pointer items-center justify-between">
                      {selected ? (
                        <span className="listbox-options-icon">
                          <IconCheck className="focus:outline-none" />
                        </span>
                      ) : null}
                      <span className={selected ? '' : 'pl-6'}>错题本</span>
                    </div>
                  )}
                </Listbox.Option>
                <Listbox.Option key={-1} value={-1}>
                  {({ selected }) => (
                    <div className="group flex cursor-pointer items-center justify-between">
                      {selected ? (
                        <span className="listbox-options-icon">
                          <IconCheck className="focus:outline-none" />
                        </span>
                      ) : null}
                      <span className={selected ? '' : 'pl-6'}>整个词库</span>
                    </div>
                  )}
                </Listbox.Option>
                {range(0, chapterCount, 1).map((index) => (
                  <Listbox.Option key={index} value={index}>
                    {({ selected }) => (
                      <div className="group flex cursor-pointer items-center justify-between">
                        {selected ? (
                          <span className="listbox-options-icon">
                            <IconCheck className="focus:outline-none" />
                          </span>
                        ) : null}
                        <span className={selected ? '' : 'pl-6'}>第 {index + 1} 单元</span>
                      </div>
                    )}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </Transition>
          </Listbox>
        </Tooltip>
      )}
    </>
  )
}
