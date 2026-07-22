export type PetColorId = 'natural' | 'rose' | 'sky' | 'mint' | 'violet' | 'gold' | 'coral' | 'silver'

export type PetColor = {
  id: PetColorId
  name: string
  swatch: string
  filter: string
}

export const DEFAULT_PET_COLOR: PetColorId = 'natural'

export const PET_COLORS: PetColor[] = [
  { id: 'natural', name: '原色', swatch: '#f59e0b', filter: 'none' },
  { id: 'rose', name: '樱粉', swatch: '#fb7185', filter: 'hue-rotate(305deg) saturate(1.25) brightness(1.08)' },
  { id: 'sky', name: '晴蓝', swatch: '#38bdf8', filter: 'hue-rotate(165deg) saturate(1.25) brightness(1.05)' },
  { id: 'mint', name: '薄荷', swatch: '#34d399', filter: 'hue-rotate(105deg) saturate(1.15) brightness(1.08)' },
  { id: 'violet', name: '葡萄', swatch: '#a78bfa', filter: 'hue-rotate(230deg) saturate(1.2) brightness(1.03)' },
  { id: 'gold', name: '暖金', swatch: '#facc15', filter: 'hue-rotate(5deg) saturate(1.45) brightness(1.12)' },
  { id: 'coral', name: '珊瑚', swatch: '#fb923c', filter: 'hue-rotate(340deg) saturate(1.35) brightness(1.08)' },
  { id: 'silver', name: '银灰', swatch: '#94a3b8', filter: 'grayscale(.8) saturate(.45) brightness(1.12)' },
]

export function getPetColor(color?: string): PetColor {
  return PET_COLORS.find((item) => item.id === color) || PET_COLORS[0]
}
