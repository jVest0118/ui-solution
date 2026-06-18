import React from 'react'
import { Avatar, Button, Space, Typography } from 'antd'
import { UserOutlined, LogoutOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'
import { useNavigate } from 'react-router-dom'

const { Text } = Typography

export interface UserProfileCardProps {
  /** 제목 (직책/타이틀). 미설정 시 부서명 표시 */
  title?: string
  /** 배경색 */
  bgColor?: string
  /** 로그아웃 버튼 표시 여부 */
  showLogout?: boolean
  /** 추가 통계 항목 (label: value 쌍) */
  stats?: { label: string; value: string | number }[]
  /** 이미지 크기(px) */
  avatarSize?: number
  width?: number
  height?: number
}

const UserProfileCard: React.FC<UserProfileCardProps> = ({
  title,
  bgColor = '#1677ff',
  showLogout = true,
  stats = [],
  avatarSize = 100,
  width,
  height,
}) => {
  const { userNm, deptNm, profileImgUrl, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const displayTitle = title || deptNm || ''

  return (
    <div
      style={{
        background: bgColor,
        color: '#fff',
        borderRadius: 12,
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        width: width ?? '100%',
        height: height ?? '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* 프로필 이미지 */}
      <Avatar
        size={avatarSize}
        src={profileImgUrl ?? undefined}
        icon={!profileImgUrl ? <UserOutlined /> : undefined}
        style={{
          border: '3px solid rgba(255,255,255,0.6)',
          background: profileImgUrl ? undefined : 'rgba(255,255,255,0.2)',
          flexShrink: 0,
        }}
      />

      {/* 이름 + 직책 */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>{userNm}</div>
        {displayTitle && (
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>{displayTitle}</div>
        )}
      </div>

      {/* 통계 항목 */}
      {stats.length > 0 && (
        <div style={{ width: '100%', borderTop: '1px solid rgba(255,255,255,0.3)', paddingTop: 10 }}>
          {stats.map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
              <Text style={{ color: 'rgba(255,255,255,0.8)' }}>{s.label}</Text>
              <Text style={{ color: '#fff', fontWeight: 600 }}>{s.value}</Text>
            </div>
          ))}
        </div>
      )}

      {/* 로그아웃 */}
      {showLogout && (
        <Button
          icon={<LogoutOutlined />}
          onClick={handleLogout}
          style={{
            marginTop: 'auto',
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.4)',
            color: '#fff',
          }}
        >
          로그아웃
        </Button>
      )}
    </div>
  )
}

export default UserProfileCard
