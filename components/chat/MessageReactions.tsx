'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import { motion, AnimatePresence } from 'framer-motion'
import { Smile } from 'lucide-react'
import { ALL_EMOJIS } from '@/lib/emojiData'
import { useReactionsPicker } from '@/contexts/ReactionsPickerContext'

type Reaction = {
  id: number
  message_id: number
  user_id: string
  emoji: string
}

interface Props {
  messageId: number
  isMe: boolean
}

const QUICK_EMOJIS = ['❤️', '😂', '👍', '🔥', '😢', '🎉', '👏', '😡']

export default function MessageReactions({ messageId, isMe }: Props) {
  const [reactions, setReactions] = useState<Reaction[]>([])
  const supabase = useMemo(() => createClient(), [])
  const { user } = useAuth()
  const { openMessageId, setOpenMessageId } = useReactionsPicker()

  const buttonRef = useRef<HTMLButtonElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)

  const [verticalPos, setVerticalPos] = useState<'top' | 'bottom'>('top')

  const isPickerOpen = openMessageId === messageId

  // Fetch initial reactions
  const fetchReactions = useCallback(async () => {
    const { data } = await supabase
      .from('message_reactions')
      .select('*')
      .eq('message_id', messageId)
    if (data) setReactions(data)
  }, [messageId, supabase])

  useEffect(() => {
    fetchReactions()

    // Real-time subscription for others' changes
    const channel = supabase
      .channel(`reactions-${messageId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions',
          filter: `message_id=eq.${messageId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newReaction = payload.new as Reaction
            setReactions(prev => {
              const exists = prev.find(r => r.id === newReaction.id)
              if (exists) return prev
              return [...prev, newReaction]
            })
          } else if (payload.eventType === 'DELETE') {
            const oldId = payload.old.id
            setReactions(prev => prev.filter(r => r.id !== oldId))
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Reaction
            setReactions(prev =>
              prev.map(r => (r.id === updated.id ? updated : r))
            )
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [fetchReactions, messageId, supabase])

  // Smart vertical positioning
  useEffect(() => {
    if (!isPickerOpen || !buttonRef.current) return
    const buttonRect = buttonRef.current.getBoundingClientRect()
    const vh = window.innerHeight
    const pickerHeight = 320
    const spaceBelow = vh - buttonRect.bottom
    setVerticalPos(spaceBelow >= pickerHeight ? 'bottom' : 'top')
  }, [isPickerOpen])

  const closePicker = useCallback(() => {
    setOpenMessageId(null)
  }, [setOpenMessageId])

  // ✅ Single reaction per user – toggle logic
  const toggleReaction = async (emoji: string) => {
    if (!user) return

    // Current user's existing reaction (if any)
    const myReaction = reactions.find(r => r.user_id === user.id)

    if (myReaction && myReaction.emoji === emoji) {
      // Toggle off
      // Optimistic remove
      setReactions(prev => prev.filter(r => r.id !== myReaction.id))
      // DB delete
      await supabase
        .from('message_reactions')
        .delete()
        .eq('id', myReaction.id)
    } else {
      // If user already has a different reaction, remove it first
      if (myReaction) {
        setReactions(prev => prev.filter(r => r.id !== myReaction.id))
        await supabase
          .from('message_reactions')
          .delete()
          .eq('id', myReaction.id)
      }

      // Add new reaction optimistically
      const tempId = Date.now() + Math.random()
      const optimisticReaction: Reaction = {
        id: tempId,
        message_id: messageId,
        user_id: user.id,
        emoji,
      }
      setReactions(prev => [...prev, optimisticReaction])

      const { data, error } = await supabase
        .from('message_reactions')
        .insert({ message_id: messageId, user_id: user.id, emoji })
        .select()
        .single()

      if (!error && data) {
        setReactions(prev =>
          prev.map(r => (r.id === tempId ? data : r))
        )
      } else {
        // Rollback if DB fails
        setReactions(prev => prev.filter(r => r.id !== tempId))
      }
    }

    closePicker()
  }

  // Group reactions for display
  const grouped = reactions.reduce((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = { count: 0, includesMe: false }
    acc[r.emoji].count++
    if (r.user_id === user?.id) acc[r.emoji].includesMe = true
    return acc
  }, {} as Record<string, { count: number; includesMe: boolean }>)

  const groupedEntries = Object.entries(grouped)

  const handleTogglePicker = () => {
    setOpenMessageId(isPickerOpen ? null : messageId)
  }

  const horizontalClass = isMe ? 'right-0' : 'left-0'

  return (
    <div className="relative flex items-center gap-0.5 min-h-[24px] flex-wrap">
      <AnimatePresence mode="popLayout">
        {groupedEntries.map(([emoji, { count, includesMe }]) => (
          <motion.button
            key={emoji}
            onClick={() => toggleReaction(emoji)}
            whileTap={{ scale: 0.85 }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            className={`px-1.5 py-0.5 rounded-full text-xs flex items-center gap-0.5 transition-colors ${
              includesMe
                ? 'bg-blue-500/30 text-blue-300 border border-blue-400/40 shadow-lg shadow-blue-500/20'
                : 'bg-white/10 text-gray-200 hover:bg-white/20 border border-transparent'
            }`}
          >
            <span className="text-sm">{emoji}</span>
            <motion.span
              key={count}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              className="text-[10px] opacity-80"
            >
              {count}
            </motion.span>
          </motion.button>
        ))}
      </AnimatePresence>

      {/* Plus button to open picker */}
      <button
        ref={buttonRef}
        onClick={handleTogglePicker}
        className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white transition"
      >
        <Smile className="h-3.5 w-3.5" />
      </button>

      {/* Backdrop to close picker on outside tap */}
      <AnimatePresence>
        {isPickerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30"
            onClick={closePicker}
          />
        )}
      </AnimatePresence>

      {/* Emoji Picker */}
      <AnimatePresence>
        {isPickerOpen && (
          <motion.div
            ref={pickerRef}
            initial={{ opacity: 0, scale: 0.95, y: verticalPos === 'top' ? 10 : -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: verticalPos === 'top' ? 10 : -10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className={`absolute z-40 w-[280px] max-w-[90vw] bg-gray-900/70 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl p-2
              ${verticalPos === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}
              ${horizontalClass}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-1 mb-2 pb-2 border-b border-white/10">
              {QUICK_EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => toggleReaction(emoji)}
                  className="text-lg hover:bg-white/10 p-1 rounded transition-transform hover:scale-125"
                >
                  {emoji}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-1 max-h-[180px] overflow-y-auto">
              {ALL_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => toggleReaction(emoji)}
                  className="text-xl hover:bg-white/10 p-1 rounded transition-transform hover:scale-125 flex items-center justify-center"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}