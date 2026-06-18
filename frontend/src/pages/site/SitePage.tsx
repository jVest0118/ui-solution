import React from 'react'
import { useParams } from 'react-router-dom'
import { ScreenRenderer } from '@/components/renderer/ScreenRenderer'

const SitePage: React.FC = () => {
  const { screenId } = useParams<{ screenId: string }>()
  return <ScreenRenderer screenId={screenId!} ignoreOpenType />
}

export default SitePage
