import React, { useEffect, useState } from 'react'
import {
  Modal, Form, Input, Select, Button, Tabs, Space,
  Divider, message, Checkbox,
} from 'antd'
import { ResizableModal } from '@/components/ui/ResizableModal'
import {
  PlusOutlined, MinusCircleOutlined, StarOutlined, StarFilled,
} from '@ant-design/icons'
import api from '@/api/axios'

const EMAIL_TYPES   = ['개인', '직장', '학교', '기타']
const PHONE_TYPES   = ['휴대폰', '집', '직장', '팩스', '기타']
const COUNTRY_CODES = [
  { code: '+82', label: '대한민국 +82' },
  { code: '+1',  label: '미국 +1' },
  { code: '+81', label: '일본 +81' },
  { code: '+86', label: '중국 +86' },
  { code: '+44', label: '영국 +44' },
]

interface EmailEntry  { type: string; email: string; isDefault?: boolean }
interface PhoneEntry  { type: string; countryCode: string; phone: string; isDefault?: boolean }
interface ContactData {
  id?:        number
  lastName?:  string
  firstName?: string
  nickname?:  string
  company?:   string
  department?:string
  position?:  string
  emails?:    EmailEntry[]
  phones?:    PhoneEntry[]
  cgroups?:   string[]
  favorite?:  boolean
}

interface Props {
  open:     boolean
  initial?: ContactData | null
  groups:   string[]
  onClose:  () => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSaved:  (contact: any) => void
  onGroupCreated: (name: string) => void
}

const defaultEmails  = (): EmailEntry[]  => [{ type: '개인',  email: '',       isDefault: true }]
const defaultPhones  = (): PhoneEntry[]  => [{ type: '휴대폰', countryCode: '+82', phone: '', isDefault: true }]

const ContactModal: React.FC<Props> = ({
  open, initial, groups, onClose, onSaved, onGroupCreated,
}) => {
  const [form]       = Form.useForm()
  const [saving,     setSaving]     = useState(false)
  const [emails,     setEmails]     = useState<EmailEntry[]>(defaultEmails())
  const [phones,     setPhones]     = useState<PhoneEntry[]>(defaultPhones())
  const [cgroups,    setCgroups]    = useState<string[]>([])
  const [favorite,   setFavorite]   = useState(false)
  const [newGroup,   setNewGroup]   = useState('')
  const [groupSearch,setGroupSearch]= useState('')

  useEffect(() => {
    if (!open) return
    if (initial) {
      form.setFieldsValue({
        lastName:   initial.lastName   ?? '',
        firstName:  initial.firstName  ?? '',
        nickname:   initial.nickname   ?? '',
        company:    initial.company    ?? '',
        department: initial.department ?? '',
        position:   initial.position   ?? '',
      })
      setEmails(initial.emails?.length  ? initial.emails  : defaultEmails())
      setPhones(initial.phones?.length  ? initial.phones  : defaultPhones())
      setCgroups(initial.cgroups ?? [])
      setFavorite(initial.favorite ?? false)
    } else {
      form.resetFields()
      setEmails(defaultEmails())
      setPhones(defaultPhones())
      setCgroups([])
      setFavorite(false)
    }
    setNewGroup('')
    setGroupSearch('')
  }, [open, initial, form])

  const handleSave = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      const payload = { ...values, emails, phones, cgroups, favorite, id: initial?.id }
      const res = initial?.id
        ? await api.put(`/contacts/${initial.id}`, payload)
        : await api.post('/contacts', payload)
      message.success(initial?.id ? '연락처가 수정되었습니다.' : '연락처가 저장되었습니다.')
      onSaved(res.data.data)
      onClose()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      message.error(err.response?.data?.message ?? '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  const updateEmail = (idx: number, patch: Partial<EmailEntry>) =>
    setEmails(prev => prev.map((e, i) => i === idx ? { ...e, ...patch } : e))

  const updatePhone = (idx: number, patch: Partial<PhoneEntry>) =>
    setPhones(prev => prev.map((p, i) => i === idx ? { ...p, ...patch } : p))

  const addEmail  = () => setEmails(prev => [...prev, { type: '개인', email: '', isDefault: false }])
  const addPhone  = () => setPhones(prev => [...prev, { type: '휴대폰', countryCode: '+82', phone: '', isDefault: false }])
  const delEmail  = (idx: number) => setEmails(prev => prev.filter((_, i) => i !== idx))
  const delPhone  = (idx: number) => setPhones(prev => prev.filter((_, i) => i !== idx))

  const handleAddGroup = () => {
    const name = newGroup.trim()
    if (!name) return
    if (!cgroups.includes(name)) setCgroups(prev => [...prev, name])
    if (!groups.includes(name)) onGroupCreated(name)
    setNewGroup('')
    setGroupSearch('')
  }

  const toggleGroup = (name: string) =>
    setCgroups(prev => prev.includes(name) ? prev.filter(g => g !== name) : [...prev, name])

  const filteredGroups = groups.filter(g =>
    !groupSearch || g.toLowerCase().includes(groupSearch.toLowerCase()))

  const inputStyle = { borderRadius: 6 }

  return (
    <ResizableModal
      open={open}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>
            {initial?.id ? '연락처 편집' : '새 연락처'}
          </span>
          <Button
            type="text" size="small"
            icon={favorite ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
            onClick={() => setFavorite(f => !f)}
            style={{ padding: '2px 4px' }}
          />
        </div>
      }
      onCancel={onClose}
      footer={
        <Space>
          <Button onClick={onClose}>취소</Button>
          <Button type="primary" loading={saving} onClick={handleSave}>저장</Button>
        </Space>
      }
      width={560}
      destroyOnClose
    >
      <Tabs
        defaultActiveKey="direct"
        style={{ marginTop: -8 }}
        items={[
          {
            key: 'direct',
            label: '직접 등록',
            children: (
              <Form form={form} layout="horizontal" labelCol={{ span: 4 }} wrapperCol={{ span: 20 }}>

                {/* 이름 */}
                <Form.Item label="이름" style={{ marginBottom: 14 }}>
                  <Space.Compact style={{ width: '100%' }}>
                    <Form.Item name="lastName"  noStyle>
                      <Input style={{ ...inputStyle, width: '45%' }} placeholder="성" />
                    </Form.Item>
                    <Form.Item name="firstName" noStyle>
                      <Input style={{ ...inputStyle, width: '55%' }} placeholder="이름" />
                    </Form.Item>
                  </Space.Compact>
                </Form.Item>

                <Form.Item name="nickname" label="닉네임" style={{ marginBottom: 14 }}>
                  <Input style={inputStyle} placeholder="닉네임" />
                </Form.Item>

                {/* 이메일 */}
                <Form.Item label="이메일" style={{ marginBottom: 6 }}>
                  {emails.map((e, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                      <Select
                        value={e.type} onChange={v => updateEmail(idx, { type: v })}
                        options={EMAIL_TYPES.map(t => ({ value: t, label: t }))}
                        style={{ width: 90 }} size="small"
                        suffixIcon={null}
                      />
                      <Input
                        value={e.email}
                        onChange={ev => updateEmail(idx, { email: ev.target.value })}
                        placeholder="이메일 주소"
                        size="small"
                        style={{ flex: 1, borderRadius: 6 }}
                      />
                      {emails.length > 1 && (
                        <MinusCircleOutlined
                          style={{ color: '#ef4444', cursor: 'pointer' }}
                          onClick={() => delEmail(idx)}
                        />
                      )}
                    </div>
                  ))}
                  <Button type="link" size="small" icon={<PlusOutlined />} onClick={addEmail}
                    style={{ padding: 0, fontSize: 12 }}>
                    이메일 추가
                  </Button>
                </Form.Item>

                {/* 전화번호 */}
                <Form.Item label="전화번호" style={{ marginBottom: 6 }}>
                  {phones.map((p, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                      <Select
                        value={p.type} onChange={v => updatePhone(idx, { type: v })}
                        options={PHONE_TYPES.map(t => ({ value: t, label: t }))}
                        style={{ width: 80 }} size="small"
                        suffixIcon={null}
                      />
                      <Select
                        value={p.countryCode} onChange={v => updatePhone(idx, { countryCode: v })}
                        options={COUNTRY_CODES.map(c => ({ value: c.code, label: c.label }))}
                        style={{ width: 130 }} size="small"
                      />
                      <Input
                        value={p.phone}
                        onChange={ev => updatePhone(idx, { phone: ev.target.value })}
                        placeholder="전화번호"
                        size="small"
                        style={{ flex: 1, borderRadius: 6 }}
                      />
                      {phones.length > 1 && (
                        <MinusCircleOutlined
                          style={{ color: '#ef4444', cursor: 'pointer' }}
                          onClick={() => delPhone(idx)}
                        />
                      )}
                    </div>
                  ))}
                  <Button type="link" size="small" icon={<PlusOutlined />} onClick={addPhone}
                    style={{ padding: 0, fontSize: 12 }}>
                    전화번호 추가
                  </Button>
                </Form.Item>

                {/* 회사 */}
                <Divider style={{ margin: '10px 0' }} />
                <Form.Item label="회사" style={{ marginBottom: 6 }}>
                  <Space.Compact style={{ width: '100%' }}>
                    <Form.Item name="company" noStyle>
                      <Input style={inputStyle} placeholder="회사명" />
                    </Form.Item>
                    <Form.Item name="department" noStyle>
                      <Input style={inputStyle} placeholder="부서" />
                    </Form.Item>
                    <Form.Item name="position" noStyle>
                      <Input style={inputStyle} placeholder="직급" />
                    </Form.Item>
                  </Space.Compact>
                </Form.Item>

                {/* 그룹 */}
                <Divider style={{ margin: '10px 0' }} />
                <Form.Item label="그룹" style={{ marginBottom: 0 }}>
                  <div style={{
                    border: '1px solid #d9d9d9', borderRadius: 8, overflow: 'hidden',
                    maxHeight: 220,
                  }}>
                    {/* 선택된 그룹 태그 */}
                    {cgroups.length > 0 && (
                      <div style={{ padding: '6px 10px', borderBottom: '1px solid #f0f0f0', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {cgroups.map(g => (
                          <span key={g} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            background: '#eff6ff', border: '1px solid #bfdbfe',
                            borderRadius: 12, padding: '1px 8px', fontSize: 12, color: '#1d4ed8',
                          }}>
                            {g}
                            <span
                              style={{ cursor: 'pointer', fontSize: 10, color: '#60a5fa' }}
                              onClick={() => toggleGroup(g)}
                            >✕</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* 검색 */}
                    <div style={{ padding: '6px 10px', borderBottom: '1px solid #f0f0f0' }}>
                      <Input
                        size="small" prefix={<span style={{ color: '#94a3b8', fontSize: 13 }}>🔍</span>}
                        placeholder="그룹 이름"
                        value={groupSearch}
                        onChange={e => setGroupSearch(e.target.value)}
                        bordered={false}
                        style={{ padding: 0 }}
                      />
                    </div>

                    {/* 그룹 목록 */}
                    <div style={{ maxHeight: 120, overflowY: 'auto' }}>
                      {filteredGroups.map(g => (
                        <div
                          key={g}
                          onClick={() => toggleGroup(g)}
                          style={{
                            padding: '6px 12px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 8,
                            background: cgroups.includes(g) ? '#eff6ff' : 'transparent',
                          }}
                          onMouseEnter={e => { if (!cgroups.includes(g)) e.currentTarget.style.background = '#f8fafc' }}
                          onMouseLeave={e => { e.currentTarget.style.background = cgroups.includes(g) ? '#eff6ff' : 'transparent' }}
                        >
                          <Checkbox checked={cgroups.includes(g)} onChange={() => toggleGroup(g)} />
                          <span style={{ fontSize: 13 }}>{g}</span>
                        </div>
                      ))}
                      {filteredGroups.length === 0 && groupSearch && (
                        <div style={{ padding: '6px 12px', color: '#94a3b8', fontSize: 12 }}>
                          검색 결과 없음
                        </div>
                      )}
                    </div>

                    {/* 새 그룹 추가 */}
                    <div
                      style={{
                        padding: '7px 12px', cursor: 'pointer', borderTop: '1px solid #f0f0f0',
                        color: '#6366f1', fontSize: 13, fontWeight: 500,
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}
                    >
                      <PlusOutlined style={{ fontSize: 12 }} />
                      <Input
                        bordered={false}
                        placeholder="새 그룹 이름 입력 후 Enter"
                        size="small"
                        value={newGroup}
                        onChange={e => setNewGroup(e.target.value)}
                        onPressEnter={handleAddGroup}
                        style={{ padding: 0, color: '#6366f1', flex: 1 }}
                        onClick={e => e.stopPropagation()}
                      />
                    </div>
                  </div>
                </Form.Item>

              </Form>
            ),
          },
          {
            key: 'import',
            label: '불러오기',
            children: (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📂</div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>CSV / VCF 파일 불러오기</div>
                <div style={{ fontSize: 12, marginTop: 6 }}>준비 중입니다.</div>
              </div>
            ),
          },
        ]}
      />
    </ResizableModal>
  )
}

export default ContactModal
