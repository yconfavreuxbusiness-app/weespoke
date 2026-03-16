'use client'

export function Modal({ children, onClose, maxWidth = 560 }: {
  children: React.ReactNode
  onClose: () => void
  maxWidth?: number
}) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: `${maxWidth}px` }} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}
