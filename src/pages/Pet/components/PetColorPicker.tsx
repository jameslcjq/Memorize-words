import { PET_COLORS } from '@/constants/pet-colors'

type Props = {
  value?: string
  onChange: (color: string) => void
  disabled?: boolean
}

export default function PetColorPicker({ value = 'natural', onChange, disabled = false }: Props) {
  return (
    <div className="grid grid-cols-4 gap-3" role="radiogroup" aria-label="宠物颜色">
      {PET_COLORS.map((color) => {
        const selected = value === color.id
        return (
          <button
            key={color.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(color.id)}
            className={`flex flex-col items-center gap-1 rounded-xl border-2 p-2 transition-all disabled:opacity-50 ${
              selected
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                : 'border-gray-100 hover:border-indigo-200 dark:border-gray-700'
            }`}
          >
            <span className="h-7 w-7 rounded-full border-2 border-white shadow" style={{ backgroundColor: color.swatch }} />
            <span className="text-xs text-gray-600 dark:text-gray-300">{color.name}</span>
          </button>
        )
      })}
    </div>
  )
}
