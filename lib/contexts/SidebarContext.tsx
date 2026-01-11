'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type SidebarContextType = {
  isOpen: boolean
  toggle: () => void
  setOpen: (open: boolean) => void
  isMobile: boolean
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false) // デフォルト閉じた状態
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      // Use touch capability so narrow desktop windows still show the sidebar.
      const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches
      const noHover = window.matchMedia('(hover: none)').matches
      const isTouch = hasCoarsePointer || noHover || navigator.maxTouchPoints > 0
      setIsMobile(window.innerWidth < 1024 && isTouch)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const toggle = () => setIsOpen(!isOpen)
  const setOpenValue = (open: boolean) => setIsOpen(open)

  return (
    <SidebarContext.Provider value={{ isOpen, toggle, setOpen: setOpenValue, isMobile }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar must be used within SidebarProvider')
  }
  return context
}
