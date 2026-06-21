import React from 'react'

interface QSpinnerProps {
  /** 스피너 지름(px). 기본 68 */
  size?: number
  /** true면 화면 전체를 덮는 오버레이로 표시 */
  fullscreen?: boolean
}

const COLOR = '#1677ff'

export const QSpinner: React.FC<QSpinnerProps> = ({ size = 68, fullscreen = false }) => {
  const border = Math.max(2, Math.round(size / 22))
  const fontSize = Math.round(size * 0.43)

  const spinner = (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {/* 베이스 링 (연한 파란 원) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: `${border}px solid rgba(22, 119, 255, 0.12)`,
          animation: 'q-ring-glow 2s ease-in-out infinite',
        }}
      />

      {/* 회전 아크 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: `${border}px solid transparent`,
          borderTopColor: COLOR,
          borderRightColor: COLOR,
          animation: 'q-spin 0.85s linear infinite',
        }}
      />

      {/* Q 글씨 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize,
          fontWeight: 900,
          fontFamily: 'Georgia, "Times New Roman", serif',
          color: COLOR,
          lineHeight: 1,
          userSelect: 'none',
          animation: 'q-blur-pulse 2s ease-in-out infinite',
        }}
      >
        Q
      </div>
    </div>
  )

  if (!fullscreen) return spinner

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(255, 255, 255, 0.88)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
      }}
    >
      {spinner}
    </div>
  )
}
