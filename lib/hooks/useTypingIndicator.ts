'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

type TypingUser = {
  userId: string
  name: string
}

export function useTypingIndicator(
  channelName: string,
  currentUserId: string,
  currentUserName: string
) {
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingUser>>(new Map())
  // ✅ Stable client – ek hi instance
  const supabase = useMemo(() => createClient(), [])
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  useEffect(() => {
    if (!currentUserId) return

    const channel = supabase.channel(channelName, {
      config: { broadcast: { ack: false } },
    })

    channel
      .on('broadcast', { event: 'typing' }, (payload) => {
        const { userId, name } = payload.payload
        if (userId === currentUserId) return

        setTypingUsers((prev) => {
          const next = new Map(prev)
          next.set(userId, { userId, name })
          return next
        })

        const existingTimer = timersRef.current.get(userId)
        if (existingTimer) clearTimeout(existingTimer)

        const timer = setTimeout(() => {
          setTypingUsers((prev) => {
            const next = new Map(prev)
            next.delete(userId)
            return next
          })
          timersRef.current.delete(userId)
        }, 3000)

        timersRef.current.set(userId, timer)
      })
      .on('broadcast', { event: 'stop-typing' }, (payload) => {
        const { userId } = payload.payload
        setTypingUsers((prev) => {
          const next = new Map(prev)
          next.delete(userId)
          return next
        })
        const timer = timersRef.current.get(userId)
        if (timer) {
          clearTimeout(timer)
          timersRef.current.delete(userId)
        }
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      timersRef.current.forEach((t) => clearTimeout(t))
      timersRef.current.clear()
      channel.unsubscribe()
      channelRef.current = null
    }
  }, [channelName, currentUserId])   // supabase hataya

  // ✅ Stable emit functions (ref se safe)
  const emitTyping = useCallback(() => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: currentUserId, name: currentUserName },
    })
  }, [currentUserId, currentUserName])

  const emitStopTyping = useCallback(() => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'stop-typing',
      payload: { userId: currentUserId },
    })
  }, [currentUserId])

  return { typingUsers, emitTyping, emitStopTyping }
}