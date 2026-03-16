'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export function Modal({ children, onClose, maxWidth = 560 }: {
  children: React.ReactNode
  onClose: () => void
  maxWidth?: number
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  if (!mounted) return null

  return createPortal(
    <div className="overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: `${maxWidth}px` }}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  )
}
