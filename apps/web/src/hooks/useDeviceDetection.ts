import { useState, useEffect } from 'react'

export interface DeviceInfo {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isNarrowMobile: boolean
  isTouch: boolean
  isPortrait: boolean
  width: number
  height: number
}

export function useDeviceDetection(): DeviceInfo {
  const getDeviceInfo = (): DeviceInfo => {
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isNarrowMobile: false,
        isTouch: false,
        isPortrait: true,
        width: 1280,
        height: 800,
      }
    }

    const width = window.innerWidth
    const height = window.innerHeight
    const isTouch = 'ontouchstart' in window || (navigator?.maxTouchPoints ?? 0) > 0

    return {
      isMobile: width < 768,
      isTablet: width >= 768 && width < 1024,
      isDesktop: width >= 1024,
      isNarrowMobile: width <= 360,
      isTouch,
      isPortrait: height >= width,
      width,
      height,
    }
  }

  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(getDeviceInfo)

  useEffect(() => {
    const handleResize = () => {
      setDeviceInfo(getDeviceInfo())
    }

    window.addEventListener('resize', handleResize, { passive: true })
    window.addEventListener('orientationchange', handleResize, { passive: true })

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [])

  return deviceInfo
}
