import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CloseOutlined } from '@ant-design/icons'

interface Props {
  open: boolean
  onClose: () => void
  triggerEl: Element | null   // 열기 버튼 DOM 엘리먼트
  title?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  width?: number | string
  zIndex?: number
}

type Phase = 'hidden' | 'opening' | 'visible' | 'closing'

export const ZoomModal: React.FC<Props> = ({
  open, onClose, triggerEl,
  title, children, footer,
  width = 560, zIndex = 1050,
}) => {
  const contentRef  = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<Phase>('hidden')
  const [origin, setOrigin] = useState('50% 50%')

  // ── 열기 ──────────────────────────────────────────────────
  useEffect(() => {
    if (open && phase === 'hidden') {
      setPhase('opening')   // DOM에 올림 (scale 0 상태)
    }
  }, [open, phase])

  useLayoutEffect(() => {
    // opening 단계: DOM에 올라온 직후 transform-origin 계산 후 visible로 전환
    if (phase === 'opening' && contentRef.current && triggerEl) {
      const mRect = contentRef.current.getBoundingClientRect()
      const bRect = triggerEl.getBoundingClientRect()
      const ox = bRect.left + bRect.width  / 2 - mRect.left
      const oy = bRect.top  + bRect.height / 2 - mRect.top
      setOrigin(`${ox}px ${oy}px`)
      // 다음 프레임에서 scale(1)로 애니메이션
      requestAnimationFrame(() => setPhase('visible'))
    }
  }, [phase, triggerEl])

  // ── 닫기 ──────────────────────────────────────────────────
  const handleClose = () => {
    if (contentRef.current && triggerEl) {
      const mRect = contentRef.current.getBoundingClientRect()
      const bRect = triggerEl.getBoundingClientRect()
      const ox = bRect.left + bRect.width  / 2 - mRect.left
      const oy = bRect.top  + bRect.height / 2 - mRect.top
      setOrigin(`${ox}px ${oy}px`)
    }
    setPhase('closing')
    setTimeout(() => {
      setPhase('hidden')
      onClose()
    }, 340)
  }

  if (phase === 'hidden') return null

  const isVisible = phase === 'visible'

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: isVisible ? 'rgba(0,0,0,0.45)' : 'transparent',
        transition: 'background 0.32s ease',
      }}
      onMouseDown={handleClose}
    >
      <div
        ref={contentRef}
        onMouseDown={e => e.stopPropagation()}
        style={{
          width, maxWidth: '92vw', maxHeight: '85vh',
          display: 'flex', flexDirection: 'column',
          background: '#fff',
          borderRadius: 10,
          boxShadow: '0 12px 48px rgba(0,0,0,0.28)',
          overflow: 'hidden',
          // ── 핵심 ──────────────────────────────────────────
          transformOrigin: origin,
          transform: isVisible ? 'scale(1)' : 'scale(0.04)',
          opacity:   isVisible ? 1 : 0,
          transition: phase === 'closing'
            ? 'transform 0.34s cubic-bezier(0.25,0.46,0.45,0.94), opacity 0.34s ease'
            : 'transform 0.42s cubic-bezier(0.34,1.38,0.64,1),  opacity 0.2s ease',
          // ─────────────────────────────────────────────────
        }}
      >
        {/* 헤더 */}
        {(title !== undefined) && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px 12px',
            borderBottom: '1px solid #f0f0f0',
            flexShrink: 0,
          }}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>{title}</span>
            <CloseOutlined
              style={{ cursor: 'pointer', color: '#888', fontSize: 14 }}
              onClick={handleClose}
            />
          </div>
        )}

        {/* 본문 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {children}
        </div>

        {/* 푸터 */}
        {footer && (
          <div style={{
            padding: '12px 20px',
            borderTop: '1px solid #f0f0f0',
            flexShrink: 0,
            display: 'flex', justifyContent: 'flex-end', gap: 8,
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

// ── 트리거 훅 ─────────────────────────────────────────────────
// 사용법: const { open, triggerEl, handleTrigger, handleClose } = useZoomTrigger()
export function useZoomTrigger() {
  const [open, setOpen]         = useState(false)
  const [triggerEl, setTrigger] = useState<Element | null>(null)

  const handleTrigger = (e: React.MouseEvent) => {
    setTrigger(e.currentTarget as Element)
    setOpen(true)
  }

  const handleClose = () => setOpen(false)

  return { open, triggerEl, handleTrigger, handleClose }
}
