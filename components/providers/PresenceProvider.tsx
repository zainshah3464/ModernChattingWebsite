'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'

type PresenceContextType = {
  onlineUsers: Set<string>
}

const PresenceContext = createContext<PresenceContextType>({
  onlineUsers: new Set(),
})

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const supabase = createClient()

  useEffect(() => {
    if (!user) {
      console.log('Presence: No user, skipping')
      return
    }

    console.log('Presence: Setting up channel for user', user.id)

    const channelName = 'online-users'
    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: user.id,
        },
      },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        console.log('Presence sync - full state:', state)
        const ids = Object.keys(state)
        console.log('Online IDs after sync:', ids)
        setOnlineUsers(new Set(ids))
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('Presence join:', key, newPresences)
        setOnlineUsers((prev) => new Set(prev).add(key))
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        console.log('Presence leave:', key)
        setOnlineUsers((prev) => {
          const next = new Set(prev)
          next.delete(key)
          return next
        })
      })
      .subscribe(async (status) => {
        console.log('Presence subscription status:', status)
        if (status === 'SUBSCRIBED') {
          const trackStatus = await channel.track({
            online_at: new Date().toISOString(),
          })
          console.log('Presence track status:', trackStatus)
        }
      })

    return () => {
      console.log('Presence: Cleaning up channel')
      channel.unsubscribe()
    }
  }, [user, supabase])

  return (
    <PresenceContext.Provider value={{ onlineUsers }}>
      {children}
    </PresenceContext.Provider>
  )
}

export function usePresence() {
  return useContext(PresenceContext)
}