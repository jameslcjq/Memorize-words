import { petLastSeenDropAtom } from '@/store'
import { Transition } from '@headlessui/react'
import { useAtom } from 'jotai'
import { Fragment, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function PetDropToast() {
  const [drop, setDrop] = useAtom(petLastSeenDropAtom)
  const navigate = useNavigate()

  // Auto-dismiss after 4 seconds
  useEffect(() => {
    if (!drop) return
    const timer = setTimeout(() => setDrop(null), 4000)
    return () => clearTimeout(timer)
  }, [drop, setDrop])

  return (
    <Transition
      show={!!drop}
      as={Fragment}
      enter="ease-out duration-300"
      enterFrom="opacity-0 translate-x-8"
      enterTo="opacity-100 translate-x-0"
      leave="ease-in duration-200"
      leaveFrom="opacity-100 translate-x-0"
      leaveTo="opacity-0 translate-x-8"
    >
      <div className="fixed bottom-6 right-4 z-50 flex max-w-xs items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-2xl ring-1 ring-indigo-100 dark:bg-gray-800 dark:ring-indigo-900">
        <span className="text-3xl">{drop?.itemIcon}</span>
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">🎁 获得道具！</span>
          <span className="text-sm font-bold text-gray-800 dark:text-white">{drop?.itemName}</span>
        </div>
        <button
          onClick={() => {
            setDrop(null)
            navigate('/pet/inventory')
          }}
          className="ml-2 rounded-lg bg-indigo-500 px-3 py-1 text-xs font-bold text-white hover:bg-indigo-600"
        >
          查看
        </button>
      </div>
    </Transition>
  )
}
