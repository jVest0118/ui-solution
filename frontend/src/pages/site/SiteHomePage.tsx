import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Spin, Empty, Typography, Card, Row, Col } from 'antd'
import * as Icons from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'
import api from '@/api/axios'

const { Title, Text } = Typography

interface SiteMenuItem {
  menuId: string
  parentId?: string
  menuNm: string
  screenId?: string
  menuUrl?: string
  icon?: string
  sortOrder: number
}

function buildUrl(m: SiteMenuItem) {
  if (m.screenId) return `/site/screen/${m.screenId}`
  if (m.menuUrl) return m.menuUrl
  return '#'
}

const SiteHomePage: React.FC = () => {
  const { currentProject } = useAuthStore()
  const navigate = useNavigate()
  const projectId = currentProject?.projectId ?? 'DEMO'

  const { data: menus = [], isLoading } = useQuery<SiteMenuItem[]>({
    queryKey: ['siteMenus', projectId],
    queryFn: () => api.get('/site/menus', { params: { projectId } }).then(r => r.data.data ?? []),
    staleTime: 5 * 60 * 1000,
  })

  const topMenus = menus.filter(m => !m.parentId).sort((a, b) => a.sortOrder - b.sortOrder)
  const firstScreen = topMenus.find(m => m.screenId || m.menuUrl)
    ?? menus.find(m => m.screenId || m.menuUrl)

  // 메뉴가 있으면 첫 번째 화면으로 자동 이동
  useEffect(() => {
    if (!isLoading && firstScreen) {
      navigate(buildUrl(firstScreen), { replace: true })
    }
  }, [isLoading, firstScreen, navigate])

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />

  if (menus.length === 0) {
    return (
      <Empty
        description={
          <span>
            사이트 메뉴가 아직 설정되지 않았습니다.<br />
            <Text type="secondary">관리자 → 사이트 메뉴 설정에서 메뉴를 추가해주세요.</Text>
          </span>
        }
      />
    )
  }

  // 첫 화면 이동 전 잠깐 보이는 그리드
  return (
    <div>
      <Title level={4} style={{ marginBottom: 20 }}>메뉴</Title>
      <Row gutter={[16, 16]}>
        {topMenus.map(m => {
          const IconComp = m.icon ? (Icons as unknown as Record<string, React.FC<React.SVGProps<SVGSVGElement>>>)[m.icon] : null
          return (
            <Col key={m.menuId} xs={12} sm={8} md={6}>
              <Card
                hoverable
                style={{ textAlign: 'center', cursor: 'pointer' }}
                onClick={() => navigate(buildUrl(m))}
              >
                {IconComp && <IconComp style={{ fontSize: 32, color: '#1677ff', marginBottom: 8 }} />}
                <div style={{ fontWeight: 600 }}>{m.menuNm}</div>
              </Card>
            </Col>
          )
        })}
      </Row>
    </div>
  )
}

export default SiteHomePage
