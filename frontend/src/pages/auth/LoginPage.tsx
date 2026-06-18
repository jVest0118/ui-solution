import React, { useState, useEffect } from 'react'
import { Form, Input, Button, Card, message, Typography, Alert } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'

const { Title } = Typography

const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [sessionExpired, setSessionExpired] = useState(false)
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    if (searchParams.get('expired') === '1') {
      setSessionExpired(true)
    }
  }, [searchParams])

  const onFinish = async (values: { userId: string; password: string }) => {
    setLoading(true)
    try {
      const response = await authApi.login(values)
      login(response)
      const isAdmin = response.roles?.some((r: string) =>
        ['SYSTEM_ADMIN', 'SCREEN_ADMIN', 'DEVELOPER'].includes(r)
      )
      navigate(isAdmin ? '/' : '/site')
    } catch {
      message.error('아이디 또는 비밀번호가 올바르지 않습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f0f2f5',
    }}>
      <Card style={{ width: 400, boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }}>
        {sessionExpired && (
          <Alert
            message="세션이 만료되었습니다"
            description="보안을 위해 자동으로 로그아웃되었습니다. 다시 로그인해주세요."
            type="warning"
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={3} style={{ margin: 0 }}>UI Solution Platform</Title>
          <Typography.Text type="secondary">업무 화면 개발 플랫폼</Typography.Text>
        </div>

        <Form onFinish={onFinish} size="large" autoComplete="off">
          <Form.Item name="userId" rules={[{ required: true, message: '아이디를 입력하세요.' }]}>
            <Input prefix={<UserOutlined />} placeholder="아이디" />
          </Form.Item>

          <Form.Item name="password" rules={[{ required: true, message: '비밀번호를 입력하세요.' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="비밀번호" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              로그인
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default LoginPage
