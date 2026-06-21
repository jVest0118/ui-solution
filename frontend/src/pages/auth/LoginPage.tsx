import React, { useState, useEffect } from 'react'
import { Form, Input, Button, Alert } from 'antd'
import { UserOutlined, LockOutlined, ThunderboltOutlined, AppstoreOutlined, SafetyOutlined } from '@ant-design/icons'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'

const FEATURES = [
  { icon: <ThunderboltOutlined />, label: '스키마 기반 동적 화면 생성' },
  { icon: <AppstoreOutlined />,    label: '드래그앤드롭 화면 디자인' },
  { icon: <SafetyOutlined />,      label: '세밀한 역할 기반 접근 제어' },
]

interface ApiErrorData {
  message?: string
  errorCode?: string
}

interface AxiosLikeError {
  response?: { status?: number; data?: ApiErrorData }
  message?: string
}

function parseLoginError(err: unknown): string {
  const e = err as AxiosLikeError
  const status = e.response?.status
  const data = e.response?.data

  if (status === 401 || status === 400) {
    return data?.message ?? '아이디 또는 비밀번호를 확인하세요.'
  }
  if (status) {
    const code = data?.errorCode ?? `HTTP_${status}`
    const msg  = data?.message  ?? '서버 오류가 발생했습니다.'
    return `오류가 발생하였습니다. [${code}] ${msg}`
  }
  return `오류가 발생하였습니다. [NETWORK] ${e.message ?? '서버에 연결할 수 없습니다.'}`
}

const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [sessionExpired, setSessionExpired] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    if (searchParams.get('expired') === '1') setSessionExpired(true)
  }, [searchParams])

  const onFinish = async (values: { userId: string; password: string }) => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const response = await authApi.login(values)
      login(response)
      const isAdmin = response.roles?.some((r: string) =>
        ['SYSTEM_ADMIN', 'SCREEN_ADMIN', 'DEVELOPER'].includes(r)
      )
      navigate(isAdmin ? '/' : '/site')
    } catch (err) {
      setErrorMsg(parseLoginError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', overflow: 'hidden' }}>

      {/* ── 좌측 브랜딩 패널 (모바일에서 숨김) ── */}
      <div className="login-brand-panel" style={{
        width: '44%',
        background: 'linear-gradient(150deg, #0a091a 0%, #11103a 45%, #0d1b35 100%)',
        flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden', padding: '48px 40px',
      }}>

        {/* 도트 그리드 */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(circle, rgba(99,102,241,0.22) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />

        {/* 장식 동심원 */}
        {[500, 360, 220].map((size, i) => (
          <div key={size} style={{
            position: 'absolute', pointerEvents: 'none',
            width: size, height: size, borderRadius: '50%',
            border: `1px solid rgba(99,102,241,${0.08 + i * 0.06})`,
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
          }} />
        ))}

        {/* Q 로고 */}
        <div style={{
          position: 'relative', zIndex: 1, marginBottom: 28,
          width: 90, height: 90, borderRadius: '50%',
          border: '2px solid rgba(129,140,248,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 36px rgba(99,102,241,0.28), 0 0 70px rgba(99,102,241,0.12)',
        }}>
          <span style={{
            fontSize: 44, fontWeight: 900, lineHeight: 1,
            fontFamily: 'Georgia, "Times New Roman", serif',
            color: '#818cf8',
            textShadow: '0 0 18px rgba(129,140,248,0.7)',
          }}>Q</span>
        </div>

        <h1 style={{
          position: 'relative', zIndex: 1, margin: 0,
          color: '#e2e8f0', fontSize: 24, fontWeight: 700,
          letterSpacing: '-0.4px', textAlign: 'center', marginBottom: 8,
        }}>
          UI Solution Platform
        </h1>
        <p style={{
          position: 'relative', zIndex: 1,
          color: '#64748b', fontSize: 13, margin: '0 0 48px',
          textAlign: 'center', letterSpacing: '0.5px',
        }}>
          업무 화면 개발 플랫폼
        </p>

        {/* 기능 하이라이트 */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 280 }}>
          {FEATURES.map(f => (
            <div key={f.label} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 16px', borderRadius: 10,
              background: 'rgba(99,102,241,0.08)',
              border: '1px solid rgba(99,102,241,0.18)',
            }}>
              <span style={{ fontSize: 16, color: '#818cf8' }}>{f.icon}</span>
              <span style={{ color: '#94a3b8', fontSize: 13 }}>{f.label}</span>
            </div>
          ))}
        </div>

        <p style={{
          position: 'absolute', bottom: 24, zIndex: 1,
          color: '#334155', fontSize: 11, margin: 0, letterSpacing: '0.3px',
        }}>
          © 2026 UI Solution Platform. All rights reserved.
        </p>
      </div>

      {/* ── 우측 로그인 패널 ── */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#fafafa', padding: '48px 40px',
      }}>
        <div style={{ width: '100%', maxWidth: 380 }}>

          {sessionExpired && (
            <Alert
              message="세션이 만료되었습니다"
              description="보안을 위해 자동으로 로그아웃되었습니다. 다시 로그인해주세요."
              type="warning"
              showIcon
              style={{ marginBottom: 24, borderRadius: 10 }}
            />
          )}

          {errorMsg && (
            <Alert
              message={errorMsg}
              type="error"
              showIcon
              closable
              onClose={() => setErrorMsg(null)}
              style={{ marginBottom: 24, borderRadius: 10 }}
            />
          )}

          <div style={{ marginBottom: 36 }}>
            <h2 style={{
              margin: 0, fontSize: 26, fontWeight: 700,
              color: '#0f172a', letterSpacing: '-0.5px',
            }}>
              로그인
            </h2>
            <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 14 }}>
              계정 정보를 입력하여 시스템에 접속하세요.
            </p>
          </div>

          <Form onFinish={onFinish} size="large" autoComplete="off" layout="vertical">
            <Form.Item
              name="userId"
              label={<span style={{ color: '#374151', fontWeight: 500, fontSize: 13 }}>아이디</span>}
              rules={[{ required: true, message: '아이디를 입력하세요.' }]}
            >
              <Input
                prefix={<UserOutlined style={{ color: '#94a3b8' }} />}
                placeholder="아이디"
                style={{ borderRadius: 10, height: 48 }}
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={<span style={{ color: '#374151', fontWeight: 500, fontSize: 13 }}>비밀번호</span>}
              rules={[{ required: true, message: '비밀번호를 입력하세요.' }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
                placeholder="비밀번호"
                style={{ borderRadius: 10, height: 48 }}
              />
            </Form.Item>

            <Form.Item style={{ marginTop: 8, marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                style={{
                  height: 48, borderRadius: 10,
                  fontSize: 15, fontWeight: 600,
                  background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                  border: 'none',
                  boxShadow: '0 4px 14px rgba(99,102,241,0.38)',
                }}
              >
                로그인
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>

    </div>
  )
}

export default LoginPage
