export function LogoMark({ className = 'size-9' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="16" className="fill-salud" />
      <rect x="27" y="11" width="10" height="42" rx="3" fill="#fff" />
      <rect x="11" y="27" width="13" height="10" rx="3" fill="#fff" />
      <rect x="40" y="27" width="13" height="10" rx="3" fill="#fff" />
    </svg>
  )
}

export function Logo({ size = 'md' }) {
  const grande = size === 'lg'
  return (
    <span className="inline-flex items-center gap-3">
      <LogoMark className={grande ? 'size-12' : 'size-9'} />
      <span className="leading-none">
        <span className={`block font-bold tracking-tight ${grande ? 'text-2xl' : 'text-lg'}`}>
          SISCON
        </span>
        <span className={`block text-pizarra ${grande ? 'mt-1 text-sm' : 'mt-0.5 text-xs'}`}>
          Contabilidad CECIAMB
        </span>
      </span>
    </span>
  )
}
