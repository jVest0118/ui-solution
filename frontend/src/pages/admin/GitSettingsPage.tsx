import React, { useEffect, useState } from 'react'
import {
  Form, Input, Button, Switch, Space, Alert, Divider, Tag, message,
} from 'antd'
import {
  GithubOutlined, LinkOutlined, KeyOutlined, BranchesOutlined,
  ReloadOutlined, CheckCircleOutlined, CloseCircleOutlined,
} from '@ant-design/icons'
import api from '@/api/axios'

const GitSettingsPage: React.FC = () => {
  const [form] = Form.useForm()
  const [testing, setTesting]   = useState(false)
  const [saving,  setSaving]    = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [autoRestart, setAutoRestart] = useState(false)

  useEffect(() => {
    api.get('/git/config').then(r => {
      const d = r.data.data ?? {}
      form.setFieldsValue({
        repoPath:       d.repoPath       ?? '',
        remoteUrl:      d.remoteUrl      ?? '',
        username:       d.username       ?? '',
        branch:         d.branch         ?? 'main',
        restartCommand: d.restartCommand ?? '',
      })
      setAutoRestart(d.autoRestart === 'Y')
    }).catch(() => {/* 설정 없음 */})
  }, [form])

  const onSave = async (values: Record<string, string>) => {
    setSaving(true)
    try {
      await api.post('/git/config', { ...values, autoRestart: autoRestart ? 'Y' : 'N' })
      message.success('Git 설정이 저장되었습니다.')
      setTestResult(null)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      message.error(err.response?.data?.message ?? '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  const onTest = async () => {
    // 현재 폼 값으로 먼저 저장 후 테스트
    let values: Record<string, string>
    try {
      values = await form.validateFields()
    } catch {
      return
    }
    setTesting(true)
    setTestResult(null)
    try {
      await api.post('/git/config', { ...values, autoRestart: autoRestart ? 'Y' : 'N' })
      const r = await api.get('/git/config/test')
      setTestResult(r.data.data)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setTestResult({ success: false, message: err.response?.data?.message ?? '연결 실패' })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
          Git 저장소 설정
        </h2>
        <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 13 }}>
          GitHub / GitLab 저장소 연결 및 자동 재시작 옵션을 설정합니다.
        </p>
      </div>

      <Form form={form} layout="vertical" onFinish={onSave}>

        {/* 저장소 정보 */}
        <Divider orientation="left" style={{ color: '#64748b', fontSize: 12, fontWeight: 600, letterSpacing: '0.5px' }}>
          저장소 정보
        </Divider>

        <Form.Item
          name="repoPath"
          label="로컬 저장소 경로"
          rules={[{ required: true, message: '저장소 경로를 입력하세요.' }]}
          extra="Git 저장소가 있는 로컬 디렉터리 (예: D:\work\workspace\ui-solution)"
        >
          <Input
            prefix={<LinkOutlined style={{ color: '#94a3b8' }} />}
            placeholder="D:\work\workspace\ui-solution"
          />
        </Form.Item>

        <Form.Item
          name="remoteUrl"
          label="원격 저장소 URL"
          extra="GitHub / GitLab HTTPS URL (예: https://github.com/user/repo.git)"
        >
          <Input
            prefix={<GithubOutlined style={{ color: '#94a3b8' }} />}
            placeholder="https://github.com/username/repository.git"
          />
        </Form.Item>

        <Form.Item name="branch" label="기본 브랜치">
          <Input prefix={<BranchesOutlined style={{ color: '#94a3b8' }} />} placeholder="main" style={{ maxWidth: 200 }} />
        </Form.Item>

        {/* 인증 정보 */}
        <Divider orientation="left" style={{ color: '#64748b', fontSize: 12, fontWeight: 600, letterSpacing: '0.5px' }}>
          인증 정보
        </Divider>

        <Form.Item
          name="username"
          label="Git 사용자명"
          extra="GitHub / GitLab 계정 아이디"
        >
          <Input placeholder="github-username" style={{ maxWidth: 300 }} />
        </Form.Item>

        <Form.Item
          name="accessToken"
          label={
            <span>Personal Access Token (PAT)&nbsp;
              <Tag color="orange" style={{ fontSize: 11 }}>비밀번호 대신 사용</Tag>
            </span>
          }
          extra={
            <span>
              GitHub: Settings → Developer settings → Personal access tokens → Generate new token
              <br />권한: <code>repo</code> 체크 필요
            </span>
          }
        >
          <Input.Password
            prefix={<KeyOutlined style={{ color: '#94a3b8' }} />}
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
          />
        </Form.Item>

        <Button type="default" loading={testing} icon={<LinkOutlined />} onClick={onTest} style={{ marginBottom: 16 }}>
          연결 테스트
        </Button>

        {testResult && (
          <Alert
            type={testResult.success ? 'success' : 'error'}
            icon={testResult.success ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
            showIcon
            message={testResult.message}
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Pull 후 재시작 */}
        <Divider orientation="left" style={{ color: '#64748b', fontSize: 12, fontWeight: 600, letterSpacing: '0.5px' }}>
          Pull 후 자동 재시작
        </Divider>

        <Form.Item label="Pull 완료 후 서버 자동 재시작">
          <Switch
            checked={autoRestart}
            onChange={setAutoRestart}
            checkedChildren="켜짐"
            unCheckedChildren="꺼짐"
          />
          <span style={{ marginLeft: 12, color: '#64748b', fontSize: 13 }}>
            {autoRestart
              ? 'Pull 성공 시 아래 재시작 명령어를 자동 실행합니다.'
              : '수동으로 서버를 재시작해야 합니다.'}
          </span>
        </Form.Item>

        {autoRestart && (
          <Form.Item
            name="restartCommand"
            label="재시작 명령어"
            extra={
              <span>
                예 (Windows): <code>cmd /c "cd D:\work\workspace\ui-solution\backend && start mvnw.cmd spring-boot:run"</code>
                <br />예 (Linux): <code>sh /home/app/restart.sh</code>
              </span>
            }
          >
            <Input.TextArea rows={3} placeholder="재시작 명령어를 입력하세요." />
          </Form.Item>
        )}

        <Divider />

        <Space>
          <Button type="primary" htmlType="submit" loading={saving}>
            설정 저장
          </Button>
          <Button icon={<ReloadOutlined />} onClick={() => form.resetFields()}>
            초기화
          </Button>
        </Space>
      </Form>
    </div>
  )
}

export default GitSettingsPage
