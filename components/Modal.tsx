'use client'
import { useEffect, useRef } from 'react'

const SIDEBAR_W = 220

export function Modal({ children, onClose, maxWidth = 560 }: {
  children: React.ReactNode
  onClose: () => void
  maxWidth?: number
}) {
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = modalRef.current
    if (!el) return

    const position = () => {
      const contentW = window.innerWidth - SIDEBAR_W
      const left = SIDEBAR_W + contentW / 2
      const top = window.innerHeight / 2
      el.style.left = `${left}px`
      el.style.top = `${top}px`
      el.style.transform = 'translate(-50%, -50%)'
    }

    position()
    window.addEventListener('resize', position)
    return () => window.removeEventListener('resize', position)
  }, [])

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div ref={modalRef} className="modal" style={{ maxWidth: `${maxWidth}px` }}>
        {children}
      </div>
    </>
  )
}
