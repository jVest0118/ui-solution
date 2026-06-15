import React from 'react'
import {
  Form, Input, Radio, Button, Card, message,
  Space, Typography, Divider, Alert,
} from 'antd'
import {
  CloudUploadOutlined, FolderOutlined, SaveOutlined, InfoCircleOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/api/axios'

const { Text, Title } = Typography

interface UploadSettings {
  basePath: string
  subDirType: 'DATE' | 'SCREEN_ID' | 'FIXED'
  fixedSubDir?: string
}

const SUB_DIR_LABELS: Record<string, string> = {
  DATE: '날짜별 (yyyy/MM/dd)',
  SCREEN_ID: '화면ID별',
  FIXED: '고정 경로',
}

const UploadSettingsPage: React.FC = () => {
  const [form] = Form.useForm<UploadSettings>()
  const subDirType = Form.useWatch('subDirType', form)
  const basePath = Form.useWatch('basePath', form) ?? 'uploads'
  const fixedSubDir = Form.useWatch('fixedSubDir', form) ?? 'files'
  const queryClient = useQueryClient()

  useQuery({
    queryKey: ['upload-settings'],
    queryFn: async () => {
      const res = await api.get<{ data: UploadSettings }>('/admin/upload-settings')
      form.setFieldsValue(res.data.data)
      return res.data.data
    },
  })

  const mutation = useMutation({
    mutationFn: (values: UploadSettings) => api.put('/admin/upload-settings', values),
    onSuccess: () => {
      message.success('설정이 저장되었습니다.')
      queryClient.invalidateQueries({ queryKey: ['upload-settings'] })
    },
    onError: () => message.error('저장에 실패했습니다.'),
  })

  const getPreviewPath = () => {
    const base = (basePath || 'uploads').replace(/\\/g, '/').replace(/\/$/, '')
    const uuid = 'a1b2c3d4-e5f6.pdf'
    switch (subDirType) {
      case 'DATE':      return `${base}/2026/06/15/${uuid}`
      case 'SCREEN_ID': return `${base}/SCR_000001/${uuid}`
      case 'FIXED':     return `${base}/${(fixedSubDir || 'files').replace(/\\/g, '/')}/${uuid}`
      default:          return `${base}/${uuid}`
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 760 }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>
          <CloudUploadOutlined style={{ marginRight: 8 }} />
          파일 업로드 설정
        </Title>
        <Text type="secondary">
          파일이 서버에 저장될 기본 경로와 서브 디렉토리 구성 방식을 설정합니다.
        </Text>
      </div>

      <Alert
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        message="기본 경로를 변경하면 이전에 업로드된 파일의 다운로드가 불가해질 수 있습니다. 변경 시 서버의 기존 파일을 새 경로로 이동해 주세요."
        style={{ marginBottom: 20 }}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => mutation.mutate(values)}
        initialValues={{ basePath: 'uploads', subDirType: 'DATE' }}
      >
        {/* 기본 저장 경로 */}
        <Card
          title={<><FolderOutlined style={{ marginRight: 6 }} />기본 저장 경로</>}
          style={{ marginBottom: 16 }}
        >
          <Form.Item
            name="basePath"
            label="파일 저장 기본 경로"
            rules={[{ required: true, message: '기본 경로를 입력하세요' }]}
            extra="상대경로는 서버 실행 디렉토리 기준, 절대경로도 사용 가능합니다. (예: uploads  또는  D:/storage/files)"
          >
            <Input
              prefix={<FolderOutlined style={{ color: '#aaa' }} />}
              placeholder="uploads"
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>
        </Card>

        {/* 서브 디렉토리 구성 */}
        <Card
          title="서브 디렉토리 구성 방식"
          style={{ marginBottom: 16 }}
        >
          <Form.Item name="subDirType" rules={[{ required: true }]} style={{ marginBottom: 0 }}>
            <Radio.Group style={{ width: '100%' }}>
              <Space direction="vertical" size={16} style={{ width: '100%' }}>

                <Radio value="DATE">
                  <Space direction="vertical" size={0}>
                    <Text strong>날짜별 저장</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      업로드 날짜 기준으로 연/월/일 폴더 생성 (예: uploads/2026/06/15/)
                    </Text>
                  </Space>
                </Radio>

                <Radio value="SCREEN_ID">
                  <Space direction="vertical" size={0}>
                    <Text strong>화면 ID별 저장</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      업로드한 화면의 ID를 폴더명으로 사용 (예: uploads/SCR_000001/)
                    </Text>
                  </Space>
                </Radio>

                <Radio value="FIXED">
                  <Space direction="vertical" size={0}>
                    <Text strong>고정 경로 저장</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      아래에 입력한 고정 서브 경로에 모든 파일 저장
                    </Text>
                  </Space>
                </Radio>

              </Space>
            </Radio.Group>
          </Form.Item>

          {subDirType === 'FIXED' && (
            <>
              <Divider style={{ margin: '16px 0' }} />
              <Form.Item
                name="fixedSubDir"
                label="고정 서브 경로"
                rules={[{ required: true, message: '고정 경로를 입력하세요' }]}
                extra='기본 경로 하위에 생성될 고정 폴더명 (예: files  또는  attachments/docs)'
                style={{ marginBottom: 0, marginLeft: 24 }}
              >
                <Input
                  placeholder="files"
                  style={{ fontFamily: 'monospace', maxWidth: 320 }}
                />
              </Form.Item>
            </>
          )}
        </Card>

        {/* 저장 경로 미리보기 */}
        <Card
          title={<><CloudUploadOutlined style={{ marginRight: 6 }} />저장 경로 미리보기</>}
          style={{ marginBottom: 24, background: '#f9f9f9' }}
          styles={{ body: { padding: '14px 20px' } }}
        >
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
            현재 설정 기준 실제 저장 경로 예시
          </Text>
          <Text code style={{ fontSize: 13, wordBreak: 'break-all' }}>
            {getPreviewPath()}
          </Text>
        </Card>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            icon={<SaveOutlined />}
            loading={mutation.isPending}
            size="large"
          >
            설정 저장
          </Button>
        </Form.Item>
      </Form>
    </div>
  )
}

export default UploadSettingsPage
