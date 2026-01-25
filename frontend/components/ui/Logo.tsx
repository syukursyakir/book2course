'use client'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  className?: string
}

export function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  const sizes = {
    sm: { icon: 32, text: 'text-lg' },
    md: { icon: 40, text: 'text-xl' },
    lg: { icon: 56, text: 'text-2xl' },
  }

  const { icon, text } = sizes[size]

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Logo Icon - Stacked cards with play button */}
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 56 56"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6"/>
            <stop offset="100%" stopColor="#6366f1"/>
          </linearGradient>
        </defs>
        {/* Bottom card */}
        <rect x="10" y="10" width="44" height="44" rx="6" fill="#334155"/>
        {/* Middle card */}
        <rect x="5" y="5" width="44" height="44" rx="6" fill="#475569"/>
        {/* Top card */}
        <rect x="0" y="0" width="44" height="44" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="1"/>
        {/* Play triangle */}
        <polygon points="16,12 16,32 32,22" fill="url(#logoGradient)"/>
      </svg>

      {showText && (
        <span className={`font-bold text-white ${text}`}>
          book<span className="text-gradient">2</span>course
        </span>
      )}
    </div>
  )
}
