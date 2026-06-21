import React, { useEffect, useRef, useState } from 'react'
import { Modal } from 'antd'
import type { ModalProps } from 'antd'

interface ResizableModalProps extends ModalProps {
  minWidth?: number
  maxWidth?: number
}

export const ResizableModal: React.FC<ResizableModalProps> = ({
  width,
  minWidth = 380,
  maxWidth = 1400,
  modalRender: outerRender,
  styles,
  ...rest
}) => {
  const initW = typeof width === 'number' ? width : 560
  const [mw, setMw] = useState(initW)
  const dragging = useRef(false)
  const sx      = useRef(0)
  const sw      = useRef(initW)

  useEffect(() => { setMw(initW) }, [initW])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return
      const next = Math.max(minWidth, Math.min(maxWidth, sw.current + (e.clientX - sx.current)))
      setMw(next)
    }
    const onUp = () => { dragging.current = false }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup',  onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup',  onUp)
    }
  }, [minWidth, maxWidth])

  const withHandle = (node: React.ReactNode) => (
    <div style={{ position: 'relative' }}>
      {node}
      {/* 우측 드래그 리사이즈 핸들 */}
      <div
        title="← → 드래그하여 폭 조정"
        style={{
          position: 'absolute',
          right: 0,
          top: 44,
          bottom: 44,
          width: 10,
          cursor: 'ew-resize',
          zIndex: 9999,
          userSelect: 'none',
          background: 'rgba(22, 119, 255, 0.18)',
          borderRadius: '0 6px 6px 0',
          transition: 'background 0.15s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(22, 119, 255, 0.55)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(22, 119, 255, 0.18)' }}
        onMouseDown={(e) => {
          dragging.current = true
          sx.current = e.clientX
          sw.current = mw
          e.preventDefault()
          e.stopPropagation()
        }}
      >
        {/* 그립 점 3개 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 3, height: 3, borderRadius: '50%',
              background: 'rgba(22, 119, 255, 0.7)',
            }} />
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <Modal
      {...rest}
      width={mw}
      styles={{ body: { maxHeight: '75vh', overflowY: 'auto' }, ...styles }}
      modalRender={(node) => withHandle(outerRender ? outerRender(node) : node)}
    />
  )
}
