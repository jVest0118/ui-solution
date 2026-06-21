import React, { useState, useMemo } from 'react'
import {
  Table, Button, Input, Select, Space, Typography, Tooltip,
  Tag, Avatar, Popconfirm, message, Empty, Divider,
} from 'antd'
import {
  PlusOutlined, SearchOutlined, DeleteOutlined,
  StarFilled, StarOutlined, MailOutlined, PhoneOutlined,
  BankOutlined, UserOutlined, TeamOutlined, MessageOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/api/axios'
import ContactModal from './ContactModal'

const { Title, Text, Link } = Typography

interface EmailEntry { type: string; email: string; isDefault?: boolean }
interface PhoneEntry { type: string; countryCode: string; phone: string; isDefault?: boolean }

interface Contact {
  id:         number
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

const fullName = (c: Contact) => `${c.lastName ?? ''}${c.firstName ?? ''}`.trim() || '(이름 없음)'
const initials = (c: Contact) => {
  const n = fullName(c)
  return n === '(이름 없음)' ? '?' : n.slice(0, 1)
}

const AVATAR_COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#ef4444',
  '#f59e0b','#10b981','#3b82f6','#14b8a6',
]
const avatarColor = (id: number) => AVATAR_COLORS[id % AVATAR_COLORS.length]

/* ── 우측 상세 패널 ───────────────────────────────────────── */
const DetailPanel: React.FC<{
  contact:  Contact
  onEdit:   () => void
  onDelete: () => void
  onFavorite: () => void
}> = ({ contact, onEdit, onDelete, onFavorite }) => {
  const name = fullName(contact)
  const primaryEmail = contact.emails?.find(e => e.isDefault) ?? contact.emails?.[0]
  const primaryPhone = contact.phones?.find(p => p.isDefault) ?? contact.phones?.[0]

  return (
    <div style={{ padding: '20px 20px 20px 16px', height: '100%', overflowY: 'auto' }}>
      {/* 액션 버튼 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, marginBottom: 16 }}>
        <Tooltip title="편집">
          <Button size="small" onClick={onEdit} style={{ fontSize: 12 }}>편집</Button>
        </Tooltip>
        <Tooltip title={contact.favorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}>
          <Button
            size="small" type="text"
            icon={contact.favorite
              ? <StarFilled style={{ color: '#faad14' }} />
              : <StarOutlined style={{ color: '#94a3b8' }} />}
            onClick={onFavorite}
          />
        </Tooltip>
        <Popconfirm
          title="연락처 삭제"
          description="이 연락처를 삭제하시겠습니까?"
          onConfirm={onDelete}
          okText="삭제" cancelText="취소" okButtonProps={{ danger: true }}
        >
          <Button size="small" type="text" icon={<DeleteOutlined style={{ color: '#ef4444' }} />} />
        </Popconfirm>
      </div>

      {/* 아바타 + 이름 */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <Avatar
          size={64}
          style={{ background: avatarColor(contact.id), fontSize: 26, fontWeight: 700, marginBottom: 10 }}
        >
          {initials(contact)}
        </Avatar>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', lineHeight: '1.3' }}>
          {name}
        </div>
        {contact.nickname && (
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>닉네임 {contact.nickname}</div>
        )}
      </div>

      {/* 기본 정보 */}
      {(contact.company || contact.department || contact.position) && (
        <div style={{ marginBottom: 16 }}>
          <InfoRow icon={<BankOutlined />} label="회사" value={contact.company} />
          {contact.position && <SubRow label="직위(직급)" value={contact.position} />}
          {contact.department && <SubRow label="부서" value={contact.department} />}
        </div>
      )}

      {/* 이메일 */}
      {contact.emails && contact.emails.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            이메일
          </div>
          {contact.emails.filter(e => e.email).map((e, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>{e.type}</span>
              <Link href={`mailto:${e.email}`} style={{ fontSize: 13 }}>{e.email}</Link>
            </div>
          ))}
        </div>
      )}

      {/* 전화번호 */}
      {contact.phones && contact.phones.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            전화번호
          </div>
          {contact.phones.filter(p => p.phone).map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>{p.type}</span>
              <Space size={8}>
                <span style={{ fontSize: 13 }}>{p.countryCode} {p.phone}</span>
                <Link href={`sms:${p.phone}`} style={{ fontSize: 11, color: '#6366f1' }}>SMS</Link>
              </Space>
            </div>
          ))}
        </div>
      )}

      {/* 그룹 */}
      {contact.cgroups && contact.cgroups.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            그룹
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {contact.cgroups.map(g => (
              <Tag key={g} style={{ borderRadius: 12, fontSize: 12 }}>{g}</Tag>
            ))}
          </div>
        </div>
      )}

      {/* 빠른 액션 */}
      <Divider style={{ margin: '16px 0 12px' }} />
      <Space size={8} style={{ width: '100%', justifyContent: 'center' }}>
        {primaryEmail?.email && (
          <Tooltip title={primaryEmail.email}>
            <Button icon={<MailOutlined />} size="small" href={`mailto:${primaryEmail.email}`}>
              메일 보내기
            </Button>
          </Tooltip>
        )}
        {primaryPhone?.phone && (
          <Tooltip title={primaryPhone.phone}>
            <Button icon={<MessageOutlined />} size="small" href={`sms:${primaryPhone.phone}`}>
              SMS
            </Button>
          </Tooltip>
        )}
      </Space>
    </div>
  )
}

const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value?: string | null }> = ({ icon, value }) => {
  if (!value) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
      <span style={{ color: '#94a3b8', fontSize: 14, flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: 13, color: '#1e293b' }}>{value}</span>
    </div>
  )
}

const SubRow: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => {
  if (!value) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 22, marginBottom: 2 }}>
      <span style={{ fontSize: 12, color: '#94a3b8' }}>{label}</span>
      <span style={{ fontSize: 13, color: '#374151' }}>{value}</span>
    </div>
  )
}

/* ── 메인 페이지 ──────────────────────────────────────────── */
const ContactsPage: React.FC = () => {
  const qc = useQueryClient()

  const [selected,    setSelected]    = useState<Contact | null>(null)
  const [checkedIds,  setCheckedIds]  = useState<number[]>([])
  const [modalOpen,   setModalOpen]   = useState(false)
  const [editContact, setEditContact] = useState<Contact | null>(null)
  const [searchQ,     setSearchQ]     = useState('')
  const [filterGroup, setFilterGroup] = useState<string | undefined>()

  /* ── 데이터 ─────────────────────────────────────────────── */
  const { data: contacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: ['contacts', filterGroup],
    queryFn: () =>
      api.get('/contacts', { params: { group: filterGroup } }).then(r => r.data.data ?? []),
  })

  const { data: groups = [], refetch: refetchGroups } = useQuery<string[]>({
    queryKey: ['contactGroups'],
    queryFn: () => api.get('/contacts/groups').then(r => r.data.data ?? []),
  })

  /* ── 검색 (클라이언트 사이드) ──────────────────────────── */
  const filtered = useMemo(() => {
    if (!searchQ.trim()) return contacts
    const q = searchQ.trim().toLowerCase()
    return contacts.filter(c =>
      fullName(c).toLowerCase().includes(q)
      || c.company?.toLowerCase().includes(q)
      || c.emails?.some(e => e.email?.toLowerCase().includes(q))
      || c.phones?.some(p => p.phone?.includes(q))
    )
  }, [contacts, searchQ])

  /* ── 뮤테이션 ───────────────────────────────────────────── */
  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/contacts/${id}`),
    onSuccess: () => {
      message.success('삭제되었습니다.')
      setSelected(null)
      qc.invalidateQueries({ queryKey: ['contacts'] })
    },
  })

  const batchDeleteMut = useMutation({
    mutationFn: (ids: number[]) => api.delete('/contacts/batch', { data: ids }),
    onSuccess: () => {
      message.success(`${checkedIds.length}개가 삭제되었습니다.`)
      setCheckedIds([])
      setSelected(null)
      qc.invalidateQueries({ queryKey: ['contacts'] })
    },
  })

  const favoriteMut = useMutation({
    mutationFn: (id: number) => api.post(`/contacts/${id}/favorite`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts'] }),
  })

  /* ── 테이블 컬럼 ─────────────────────────────────────────── */
  const columns = [
    {
      title: '이름', width: 180,
      render: (_: unknown, c: Contact) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button
            type="text" size="small"
            icon={c.favorite
              ? <StarFilled style={{ color: '#faad14', fontSize: 13 }} />
              : <StarOutlined style={{ color: '#d1d5db', fontSize: 13 }} />}
            onClick={e => { e.stopPropagation(); favoriteMut.mutate(c.id) }}
            style={{ padding: 0, width: 20, flexShrink: 0 }}
          />
          <Avatar size={28} style={{ background: avatarColor(c.id), fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
            {initials(c)}
          </Avatar>
          <span style={{ fontWeight: 500, fontSize: 13 }}>
            {fullName(c)}
            {c.nickname && <span style={{ color: '#94a3b8', marginLeft: 4 }}>[{c.nickname}]</span>}
          </span>
        </div>
      ),
    },
    {
      title: '직위(직급)', dataIndex: 'position', width: 110,
      render: (v: string) => <span style={{ fontSize: 13, color: '#374151' }}>{v}</span>,
    },
    {
      title: '부서', dataIndex: 'department', width: 120,
      render: (v: string) => <span style={{ fontSize: 13, color: '#374151' }}>{v}</span>,
    },
    {
      title: '회사', dataIndex: 'company', width: 140,
      render: (v: string) => <span style={{ fontSize: 13, color: '#374151' }}>{v}</span>,
    },
    {
      title: '이메일', width: 190,
      render: (_: unknown, c: Contact) => {
        const e = c.emails?.find(x => x.email)
        return e ? <Text type="secondary" style={{ fontSize: 13 }}>{e.email}</Text> : null
      },
    },
    {
      title: '전화번호', width: 140,
      render: (_: unknown, c: Contact) => {
        const p = c.phones?.find(x => x.phone)
        return p ? <span style={{ fontSize: 13, color: '#374151' }}>{p.phone}</span> : null
      },
    },
  ]

  const openEdit = (c: Contact) => { setEditContact(c); setModalOpen(true) }
  const openNew  = () => { setEditContact(null); setModalOpen(true) }

  const handleSaved = (saved: { id?: number; [k: string]: unknown }) => {
    qc.invalidateQueries({ queryKey: ['contacts'] })
    qc.invalidateQueries({ queryKey: ['contactGroups'] })
    if (selected?.id != null && selected.id === saved.id) {
      setSelected(saved as unknown as Contact)
    }
  }

  const handleGroupCreated = async (name: string) => {
    await api.post('/contacts/groups', { groupName: name })
    refetchGroups()
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)', overflow: 'hidden' }}>

      {/* ── 메인 컨텐츠 ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* 헤더 */}
        <div style={{
          padding: '16px 24px 12px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Title level={4} style={{ margin: 0, fontSize: 18 }}>내 연락처</Title>
            <Button
              type="text" size="small"
              icon={<PlusOutlined />}
              onClick={openNew}
              style={{ color: '#6366f1', fontWeight: 600, fontSize: 18, padding: '0 4px' }}
            />
          </div>

          {/* 검색 + 그룹 필터 */}
          <Space size={8}>
            <Input
              allowClear prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              placeholder="이름, 회사, 이메일 검색"
              value={searchQ} onChange={e => setSearchQ(e.target.value)}
              style={{ width: 220, borderRadius: 20 }}
            />
            <Select
              allowClear placeholder={<><TeamOutlined style={{ marginRight: 4 }} />그룹 필터</>}
              value={filterGroup}
              onChange={v => { setFilterGroup(v); setCheckedIds([]) }}
              options={groups.map(g => ({ value: g, label: g }))}
              style={{ width: 150 }}
            />
          </Space>
        </div>

        {/* 액션 바 (선택된 경우) */}
        {checkedIds.length > 0 && (
          <div style={{
            padding: '8px 24px',
            background: '#f5f3ff',
            borderBottom: '1px solid #e0e7ff',
            display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <span style={{ fontSize: 13, color: '#6366f1', fontWeight: 600 }}>
              {checkedIds.length}개 선택됨
            </span>
            <Divider type="vertical" />
            <Button
              size="small" type="text" icon={<MailOutlined />}
              onClick={() => {
                const emails = filtered
                  .filter(c => checkedIds.includes(c.id))
                  .flatMap(c => c.emails?.filter(e => e.email).map(e => e.email) ?? [])
                if (emails.length) window.location.href = `mailto:${emails.join(',')}`
              }}
            >메일 보내기</Button>
            <Popconfirm
              title={`${checkedIds.length}개 연락처를 삭제하시겠습니까?`}
              onConfirm={() => batchDeleteMut.mutate(checkedIds)}
              okText="삭제" cancelText="취소" okButtonProps={{ danger: true }}
            >
              <Button size="small" type="text" danger icon={<DeleteOutlined />}>삭제</Button>
            </Popconfirm>
            <Button size="small" type="text" onClick={() => setCheckedIds([])}>선택 해제</Button>
          </div>
        )}

        {/* 테이블 */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          <Table<Contact>
            dataSource={filtered}
            columns={columns}
            rowKey="id"
            loading={isLoading}
            size="small"
            pagination={filtered.length > 50 ? { pageSize: 50, size: 'small' } : false}
            locale={{ emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  searchQ
                    ? `'${searchQ}' 검색 결과가 없습니다.`
                    : '연락처가 없습니다. + 버튼으로 추가하세요.'
                }
              />
            )}}
            rowSelection={{
              selectedRowKeys: checkedIds,
              onChange: keys => setCheckedIds(keys as number[]),
            }}
            onRow={c => ({
              onClick: () => setSelected(prev => prev?.id === c.id ? null : c),
              style: {
                cursor: 'pointer',
                background: selected?.id === c.id ? '#f5f3ff' : undefined,
              },
            })}
            rowClassName={c => selected?.id === c.id ? 'row-selected' : ''}
          />
        </div>
      </div>

      {/* ── 우측 상세 패널 ── */}
      {selected && (
        <div style={{
          width: 300, flexShrink: 0,
          borderLeft: '1px solid #e2e8f0',
          background: '#fff',
          overflow: 'hidden',
        }}>
          <DetailPanel
            contact={selected}
            onEdit={() => openEdit(selected)}
            onDelete={() => deleteMut.mutate(selected.id)}
            onFavorite={() => favoriteMut.mutate(selected.id)}
          />
        </div>
      )}

      {/* ── 등록/수정 모달 ── */}
      <ContactModal
        open={modalOpen}
        initial={editContact}
        groups={groups}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
        onGroupCreated={handleGroupCreated}
      />

      <style>{`
        .row-selected > td { background: #f5f3ff !important; }
        .ant-table-row:hover > td { background: #fafafa !important; }
        .row-selected:hover > td { background: #ede9fe !important; }
      `}</style>
    </div>
  )
}

export default ContactsPage
