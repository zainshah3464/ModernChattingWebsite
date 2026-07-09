'use client'
import { createContext, useContext, useState, ReactNode } from 'react'

type ReactionsPickerContextType = {
  openMessageId: number | null
  setOpenMessageId: (id: number | null) => void
}

const ReactionsPickerContext = createContext<ReactionsPickerContextType>({
  openMessageId: null,
  setOpenMessageId: () => {},
})

export function ReactionsPickerProvider({ children }: { children: ReactNode }) {
  const [openMessageId, setOpenMessageId] = useState<number | null>(null)
  return (
    <ReactionsPickerContext.Provider value={{ openMessageId, setOpenMessageId }}>
      {children}
    </ReactionsPickerContext.Provider>
  )
}

export function useReactionsPicker() {
  return useContext(ReactionsPickerContext)
}