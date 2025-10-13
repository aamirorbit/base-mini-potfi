'use client'

import { useEffect } from 'react'
import { useMiniKit, useIsInMiniApp } from '@coinbase/onchainkit/minikit'

interface MiniAppProviderProps {
  children: React.ReactNode
}

export function MiniAppProvider({ children }: MiniAppProviderProps) {
  const isInMiniApp = useIsInMiniApp()
  const { context } = useMiniKit()

  useEffect(() => {
    if (isInMiniApp) {
      console.log('Running in Base Mini App', context)
    } else {
      console.log('Running in regular browser')
    }
  }, [isInMiniApp, context])

  return (
    <div className="mini-app-container">
      {children}
    </div>
  )
}
