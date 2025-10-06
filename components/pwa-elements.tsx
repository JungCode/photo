"use client"

import { useEffect } from 'react'

export default function PWAElements() {
  useEffect(() => {
    // Import and define PWA Elements only on the client side
    import('@ionic/pwa-elements/loader').then(({ defineCustomElements }) => {
      defineCustomElements(window)
    })
  }, [])

  return null
}