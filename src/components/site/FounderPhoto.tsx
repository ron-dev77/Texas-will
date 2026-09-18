import ceoFounderPortrait from '@/assets/ceo-founder-portrait.jpg'

export function FounderPhoto() {
  return (
    <img
      src={ceoFounderPortrait}
      alt="Scott Pappas, licensed Texas attorney and founder of My AI Will"
      className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
    />
  )
}
