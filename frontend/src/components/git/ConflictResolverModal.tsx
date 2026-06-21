import React, { useEffect, useState, useCallback } from 'react'
import { Modal, Button, Tag, Space, Typography, Spin, Alert, message } from 'antd'
import {
  CheckOutlined, LeftOutlined, RightOutlined, SaveOutlined,
} from '@ant-design/icons'
import api from '@/api/axios'

const { Text } = Typography

interface ConflictSection {
  oursLabel:   string
  theirsLabel: string
  ours:        string
  theirs:      string
  marker:      string
  start:       number
  end:         number
}

interface ConflictFile {
  filePath:   string
  rawContent: string
  sections:   ConflictSection[]
}

interface Props {
  open:       boolean
  filePath:   string | null
  onClose:    () => void
  onResolved: (filePath: string) => void
}

type Choice = 'ours' | 'theirs' | null

const ConflictResolverModal: React.FC<Props> = ({ open, filePath, onClose, onResolved }) => {
  const [loading, setLoading]   = useState(false)
  const [saving,  setSaving]    = useState(false)
  const [data,    setData]      = useState<ConflictFile | null>(null)
  const [choices, setChoices]   = useState<Choice[]>([])
  const [preview, setPreview]   = useState('')

  const load = useCallback(async () => {
    if (!filePath) return
    setLoading(true)
    setData(null)
    setChoices([])
    try {
      const r = await api.get('/git/conflict', { params: { filePath } })
      const d: ConflictFile = r.data.data
      setData(d)
      setChoices(new Array(d.sections.length).fill(null))
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      message.error(err.response?.data?.message ?? '파일 로드 실패')
    } finally {
      setLoading(false)
    }
  }, [filePath])

  useEffect(() => { if (open && filePath) load() }, [open, filePath, load])

  // Preview: replace each conflict section with chosen content
  useEffect(() => {
    if (!data) return
    let result = data.rawContent
    // replace from end to start to preserve offsets
    const reversed = [...data.sections].map((s, i) => ({ s, i })).reverse()
    for (const { s, i } of reversed) {
      const chosen = choices[i] === 'ours' ? s.ours : choices[i] === 'theirs' ? s.theirs : s.marker
      result = result.slice(0, s.start) + chosen + result.slice(s.end)
    }
    setPreview(result)
  }, [choices, data])

  const pick = (idx: number, side: Choice) => {
    setChoices(prev => { const n = [...prev]; n[idx] = side; return n })
  }

  const allResolved = choices.length > 0 && choices.every(c => c !== null)

  const onSave = async () => {
    if (!data) return
    setSaving(true)
    try {
      await api.post('/git/conflict/resolve', {
        filePath:        data.filePath,
        resolvedContent: preview,
      })
      message.success(`${data.filePath} 충돌 해결 완료`)
      onResolved(data.filePath)
      onClose()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      message.error(err.response?.data?.message ?? '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  const pendingCount = choices.filter(c => c === null).length

  return (
    <Modal
      open={open}
      title={
        <Space>
          <span style={{ fontSize: 15, fontWeight: 700 }}>충돌 해결</span>
          {data && (
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
              {data.filePath}
            </Text>
          )}
        </Space>
      }
      width="90vw"
      style={{ top: 24, maxWidth: 1400 }}
      onCancel={onClose}
      footer={
        <Space>
          {pendingCount > 0 && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {pendingCount}개 충돌 미해결
            </Text>
          )}
          <Button onClick={onClose}>취소</Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            disabled={!allResolved}
            loading={saving}
            onClick={onSave}
          >
            저장 및 완료
          </Button>
        </Space>
      }
      destroyOnClose
    >
      {loading && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin tip="파일 로딩 중..." />
        </div>
      )}

      {!loading && data && (
        <div style={{ display: 'flex', gap: 16, height: 'calc(90vh - 200px)' }}>

          {/* 왼쪽: 충돌 섹션 선택 */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div style={{ marginBottom: 12, color: '#64748b', fontSize: 12, fontWeight: 600 }}>
              충돌 목록 ({data.sections.length}개)
            </div>

            {data.sections.map((sec, idx) => (
              <div key={idx} style={{
                marginBottom: 16,
                border: choices[idx] ? '1.5px solid #22c55e' : '1.5px solid #f59e0b',
                borderRadius: 8,
                overflow: 'hidden',
                background: '#fff',
              }}>
                {/* 섹션 헤더 */}
                <div style={{
                  padding: '8px 14px',
                  background: choices[idx] ? '#f0fdf4' : '#fffbeb',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <Space size={4}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>충돌 #{idx + 1}</span>
                    {choices[idx] && (
                      <Tag color="success" icon={<CheckOutlined />} style={{ marginLeft: 4 }}>
                        {choices[idx] === 'ours' ? '내 변경 선택됨' : '서버 변경 선택됨'}
                      </Tag>
                    )}
                  </Space>
                </div>

                {/* 두 선택지 나란히 */}
                <div style={{ display: 'flex', gap: 0 }}>
                  {/* 내 변경 */}
                  <div style={{
                    flex: 1,
                    borderRight: '1px solid #e2e8f0',
                    background: choices[idx] === 'ours' ? '#f0fdf4' : '#fff',
                    transition: 'background 0.15s',
                  }}>
                    <div style={{
                      padding: '6px 12px',
                      background: '#fef3c7',
                      borderBottom: '1px solid #e2e8f0',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <Space size={4}>
                        <LeftOutlined style={{ color: '#d97706', fontSize: 11 }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#92400e' }}>
                          {sec.oursLabel}
                        </span>
                      </Space>
                      <Button
                        size="small"
                        type={choices[idx] === 'ours' ? 'primary' : 'default'}
                        onClick={() => pick(idx, 'ours')}
                        icon={choices[idx] === 'ours' ? <CheckOutlined /> : undefined}
                        style={{ fontSize: 11 }}
                      >
                        {choices[idx] === 'ours' ? '선택됨' : '이것 선택'}
                      </Button>
                    </div>
                    <pre style={{
                      margin: 0, padding: '10px 12px',
                      fontSize: 12, lineHeight: '1.6',
                      fontFamily: 'Consolas, "Courier New", monospace',
                      whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                      minHeight: 60, color: '#1e293b',
                    }}>
                      {sec.ours || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>(빈 내용)</span>}
                    </pre>
                  </div>

                  {/* 서버 변경 */}
                  <div style={{
                    flex: 1,
                    background: choices[idx] === 'theirs' ? '#f0fdf4' : '#fff',
                    transition: 'background 0.15s',
                  }}>
                    <div style={{
                      padding: '6px 12px',
                      background: '#dbeafe',
                      borderBottom: '1px solid #e2e8f0',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <Space size={4}>
                        <RightOutlined style={{ color: '#1d4ed8', fontSize: 11 }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#1e3a8a' }}>
                          {sec.theirsLabel}
                        </span>
                      </Space>
                      <Button
                        size="small"
                        type={choices[idx] === 'theirs' ? 'primary' : 'default'}
                        onClick={() => pick(idx, 'theirs')}
                        icon={choices[idx] === 'theirs' ? <CheckOutlined /> : undefined}
                        style={{ fontSize: 11 }}
                      >
                        {choices[idx] === 'theirs' ? '선택됨' : '이것 선택'}
                      </Button>
                    </div>
                    <pre style={{
                      margin: 0, padding: '10px 12px',
                      fontSize: 12, lineHeight: '1.6',
                      fontFamily: 'Consolas, "Courier New", monospace',
                      whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                      minHeight: 60, color: '#1e293b',
                    }}>
                      {sec.theirs || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>(빈 내용)</span>}
                    </pre>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 오른쪽: 미리보기 */}
          <div style={{
            width: 380, flexShrink: 0,
            border: '1px solid #e2e8f0', borderRadius: 8,
            overflow: 'hidden', display: 'flex', flexDirection: 'column',
          }}>
            <div style={{
              padding: '8px 14px',
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              fontSize: 12, fontWeight: 600, color: '#64748b',
            }}>
              결과 미리보기
              {pendingCount > 0 && (
                <span style={{ marginLeft: 8, color: '#f59e0b' }}>
                  ({pendingCount}개 미선택 — 충돌 마커 그대로 표시)
                </span>
              )}
            </div>
            <pre style={{
              flex: 1, overflowY: 'auto',
              margin: 0, padding: '12px 14px',
              fontSize: 11.5, lineHeight: '1.7',
              fontFamily: 'Consolas, "Courier New", monospace',
              whiteSpace: 'pre-wrap', wordBreak: 'break-all',
              color: '#1e293b', background: '#fff',
            }}>
              {preview}
            </pre>
          </div>

        </div>
      )}

      {!loading && data && !allResolved && (
        <Alert
          type="warning"
          message={`모든 충돌 항목을 선택해야 저장할 수 있습니다. (${pendingCount}개 미선택)`}
          showIcon
          style={{ marginTop: 12 }}
        />
      )}
    </Modal>
  )
}

export default ConflictResolverModal
