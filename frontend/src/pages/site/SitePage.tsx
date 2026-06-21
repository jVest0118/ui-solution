import React from 'react'
import { useParams } from 'react-router-dom'
import { Result } from 'antd'
import { QSpinner } from '@/components/QSpinner'
import { ScreenRenderer } from '@/components/renderer/ScreenRenderer'
import { useAuthStore } from '@/store/authStore'
import { useScreenAccess } from '@/hooks/useSitePermissions'

const SitePage: React.FC = () => {
  const { screenId } = useParams<{ screenId: string }>()
  const currentProject = useAuthStore(s => s.currentProject)
  const projectId = currentProject?.projectId ?? 'DEMO'

  const { isLoading, allowed } = useScreenAccess(projectId, screenId!)

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', marginTop: 120 }}><QSpinner size={72} /></div>

  if (!allowed) {
    return (
      <Result
        status="403"
        title="접근 권한이 없습니다"
        subTitle="이 화면에 접근할 권한이 없습니다. 관리자에게 문의하세요."
      />
    )
  }

  return <ScreenRenderer screenId={screenId!} ignoreOpenType />
}

export default SitePage
