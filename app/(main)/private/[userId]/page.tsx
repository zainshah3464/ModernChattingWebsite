'use client'

import { useState, useEffect, useRef, useCallback, useMemo, Fragment } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { Loader2, ArrowLeft, Check, CheckCheck } from 'lucide-react'
import Link from 'next/link'
import { usePresence } from '@/components/providers/PresenceProvider'
import { useTypingIndicator } from '@/lib/hooks/useTypingIndicator'
import ChatInput from '@/components/chat/ChatInput'
import MessageReactions from '@/components/chat/MessageReactions'

type PrivateMessage = {
  id: number
  sender_id: string
  receiver_id: string
  content: string | null
  file_url: string | null
  file_type: string | null
  thumbnail_url: string | null
  created_at: string
  read: boolean
}

type RecipientProfile = {
  id: string
  full_name: string | null
  avatar_url: string | null
  username: string | null
}

// ─────────────────────────────────────────
//  🌄 Video Background + Floating Particles
// ─────────────────────────────────────────
const VideoBackground = ({ onLoaded }: { onLoaded: () => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)
  const particlesRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; size: number; opacity: number; phase: number }>>([])
  const [videoSrc, setVideoSrc] = useState<string>('')
  const [showLoader, setShowLoader] = useState(true)

  // Choose video based on aspect ratio (portrait = mobile)
  useEffect(() => {
    const chooseVideo = () => {
      const isPortrait = window.innerWidth < window.innerHeight
      setVideoSrc(
        isPortrait
          ? '/stormlight-over-fields.720x1280.mp4'
          : '/stormlight-over-fields.1920x1080.mp4'
      )
    }
    chooseVideo()
    window.addEventListener('resize', chooseVideo)
    return () => window.removeEventListener('resize', chooseVideo)
  }, [])

  // When video can play through, hide loader
  const handleCanPlayThrough = () => {
    setShowLoader(false)
    onLoaded()
  }

  // Initialize particles canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let w = canvas.width = canvas.offsetWidth
    let h = canvas.height = canvas.offsetHeight

    // Create particles
    particlesRef.current = Array.from({ length: 50 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.3 + 0.1, // slight rightward drift
      vy: (Math.random() - 0.5) * 0.2 - 0.15, // slow upward
      size: Math.random() * 2.5 + 0.5,
      opacity: Math.random() * 0.5 + 0.3,
      phase: Math.random() * Math.PI * 2,
    }))

    const animate = (time: number) => {
      ctx.clearRect(0, 0, w, h)

      particlesRef.current.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        if (p.x < -10) p.x = w + 10
        if (p.x > w + 10) p.x = -10
        if (p.y < -10) p.y = h + 10
        if (p.y > h + 10) p.y = -10

        const pulse = Math.sin(time * 0.002 + p.phase) * 0.3 + 0.7
        const alpha = p.opacity * pulse * 0.8
        ctx.fillStyle = `rgba(255, 250, 245, ${alpha})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      })

      animFrameRef.current = requestAnimationFrame(animate)
    }

    animFrameRef.current = requestAnimationFrame(animate)

    const handleResize = () => {
      w = canvas.width = canvas.offsetWidth
      h = canvas.height = canvas.offsetHeight
      particlesRef.current.forEach(p => {
        p.x = Math.random() * w
        p.y = Math.random() * h
      })
    }
    window.addEventListener('resize', handleResize)
    return () => {
      cancelAnimationFrame(animFrameRef.current)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      {videoSrc && (
        <video
          ref={videoRef}
          key={videoSrc}
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          onCanPlayThrough={handleCanPlayThrough}
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src={videoSrc} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      )}

      {/* Particle overlay (only after loaded) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ opacity: showLoader ? 0 : 1, transition: 'opacity 1.5s' }}
      />

      {/* Loading screen */}
      <AnimatePresence>
        {showLoader && (
          <motion.div
            key="video-loader"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0 flex items-center justify-center bg-[#0b0e1a] z-30"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="flex flex-col items-center gap-4"
            >
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 blur-xl opacity-70 animate-pulse" />
                <div className="relative flex items-center justify-center w-full h-full rounded-full bg-white/10 backdrop-blur-md border border-white/20">
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                </div>
              </div>
              <p className="text-white/70 text-sm font-medium tracking-wider">
                Bringing nature to you...
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function PrivateChatPage() {
  const { userId } = useParams<{ userId: string }>()
  const { user, profile: myProfile } = useAuth()
  const router = useRouter()
  const { onlineUsers } = usePresence()
  const supabase = useMemo(() => createClient(), [])

  const channelName = `private-typing-${[user?.id, userId].sort().join('-')}`
  const { typingUsers, emitTyping, emitStopTyping } = useTypingIndicator(
    channelName,
    user?.id || '',
    myProfile?.full_name || 'Me'
  )

  const [messages, setMessages] = useState<PrivateMessage[]>([])
  const [recipient, setRecipient] = useState<RecipientProfile | null>(null)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const isOnline = onlineUsers.has(userId)
  const isRecipientTyping = typingUsers.has(userId)

  // Fetch recipient
  useEffect(() => {
    const fetchRecipient = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, username')
        .eq('id', userId)
        .single()
      if (data) setRecipient(data)
      else router.replace('/private')
    }
    if (userId) fetchRecipient()
  }, [userId, supabase, router])

  // Fetch initial messages
  useEffect(() => {
    if (!user || !userId) return
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('private_messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: true })
        .limit(100)

      if (data) {
        const relevant = data.filter(
          (msg: PrivateMessage) =>
            (msg.sender_id === user.id && msg.receiver_id === userId) ||
            (msg.sender_id === userId && msg.receiver_id === user.id)
        )
        setMessages(relevant)
      }
    }
    fetchMessages()
  }, [user, userId, supabase])

  // Mark as read
  const markAsRead = useCallback(async () => {
    if (!user || !userId || messages.length === 0) return
    const unread = messages.filter(
      (msg) => msg.sender_id === userId && msg.receiver_id === user.id && !msg.read
    )
    if (unread.length === 0) return
    const { error } = await supabase
      .from('private_messages')
      .update({ read: true })
      .in('id', unread.map((m) => m.id))
    if (!error) {
      setMessages((prev) =>
        prev.map((msg) =>
          unread.some((um) => um.id === msg.id) ? { ...msg, read: true } : msg
        )
      )
    }
  }, [user, userId, messages, supabase])

  useEffect(() => { markAsRead() }, [markAsRead])

  // Real-time subscription
  useEffect(() => {
    if (!user || !userId) return
    const channel = supabase
      .channel(`private-${user.id}-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'private_messages',
          filter: `sender_id=eq.${user.id},receiver_id=eq.${userId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as PrivateMessage])
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'private_messages',
          filter: `sender_id=eq.${userId},receiver_id=eq.${user.id}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as PrivateMessage])
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'private_messages',
          filter: `sender_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as PrivateMessage
          setMessages((prev) =>
            prev.map((msg) => (msg.id === updated.id ? { ...msg, read: updated.read } : msg))
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'private_messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as PrivateMessage
          setMessages((prev) =>
            prev.map((msg) => (msg.id === updated.id ? { ...msg, read: updated.read } : msg))
          )
        }
      )
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [user, userId, supabase])

  // Auto scroll on messages or typing indicator change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isRecipientTyping])

  // Send message
  const handleSendMessage = async (payload: {
    content: string
    file?: { url: string; type: string; thumbnail_url?: string }
  }) => {
    if (!user || !userId) return
    const msgData = {
      sender_id: user.id,
      receiver_id: userId,
      content: payload.content || null,
      file_url: payload.file?.url || null,
      file_type: payload.file?.type || null,
      thumbnail_url: payload.file?.thumbnail_url || null,
    }
    const { error } = await supabase.from('private_messages').insert(msgData)
    if (!error) emitStopTyping()
  }

  useEffect(() => {
    return () => { emitStopTyping() }
  }, [emitStopTyping])

  if (!recipient) {
    return (
      <div className="flex items-center justify-center h-full bg-[#0a0b1a]">
        <Loader2 className="animate-spin h-8 w-8 text-amber-400" />
      </div>
    )
  }

  let lastDate = ''

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <style>{`
        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 10px; }
        .chat-input-container [class*="bg-"] {
          background: transparent !important;
        }
      `}</style>

      <VideoBackground onLoaded={() => setVideoLoaded(true)} />

      {/* Chat UI fades in after video loads */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: videoLoaded ? 1 : 0 }}
        transition={{ duration: 1, delay: 0.3 }}
        className="relative z-10 flex flex-col h-full"
      >
        {/* Header – Fully Transparent */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="p-4 bg-transparent flex items-center gap-3 sticky top-0 z-20"
        >
          <Link href="/private">
            <motion.div whileHover={{ scale: 1.1, x: -2 }} whileTap={{ scale: 0.9 }} className="p-2 hover:bg-white/10 rounded-xl transition">
              <ArrowLeft className="h-5 w-5 text-white/80" />
            </motion.div>
          </Link>

          <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm ring-1 ring-white/20">
            {recipient.avatar_url ? (
              <img src={recipient.avatar_url} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
            ) : (
              recipient.full_name?.[0]?.toUpperCase() || '?'
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-white text-lg drop-shadow-md">{recipient.full_name || 'Unknown'}</p>
              {isOnline && (
                <motion.span
                  animate={{ opacity: [1, 0.6, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-xs text-green-300 bg-green-500/10 px-2.5 py-0.5 rounded-full flex items-center gap-1 backdrop-blur-sm"
                >
                  <span className="w-2 h-2 bg-green-400 rounded-full" /> Online
                </motion.span>
              )}
            </div>
            <p className="text-xs text-white/60">@{recipient.username || 'user'}</p>
          </div>
        </motion.div>

        {/* Messages Area with Typing Indicator inside */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          <LayoutGroup>
            <AnimatePresence mode="popLayout">
              {messages.map((msg) => {
                const msgDate = new Date(msg.created_at).toLocaleDateString([], {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
                const showDate = msgDate !== lastDate
                if (showDate) lastDate = msgDate

                const isMe = msg.sender_id === user?.id
                const senderProfile = isMe
                  ? { full_name: myProfile?.full_name || null, avatar_url: myProfile?.avatar_url || null }
                  : { full_name: recipient.full_name, avatar_url: recipient.avatar_url }

                return (
                  <Fragment key={msg.id}>
                    {showDate && (
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                        className="flex justify-center my-4"
                      >
                        <span className="px-5 py-2 text-xs font-semibold uppercase tracking-wider text-white/80 bg-white/10 border border-white/10 rounded-full shadow-[0_0_15px_rgba(251,191,36,0.2)] backdrop-blur-sm">
                          {msgDate}
                        </span>
                      </motion.div>
                    )}

                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                      whileHover={{ scale: 1.01 }}
                    >
                      <div className={`flex gap-3 max-w-[85%] lg:max-w-[60%] ${isMe ? 'flex-row-reverse' : ''}`}>
                        <motion.div
                          whileHover={{ scale: 1.08, rotate: 5 }}
                          className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-amber-400 to-orange-400 ring-1 ring-white/20 shadow-lg"
                        >
                          {senderProfile.avatar_url ? (
                            <img src={senderProfile.avatar_url} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">{senderProfile.full_name?.[0]?.toUpperCase() || '?'}</div>
                          )}
                        </motion.div>

                        <div>
                          {!isMe && (
                            <motion.p
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.2 }}
                              className="text-xs text-white/60 mb-1 ml-1 font-medium"
                            >
                              {senderProfile.full_name || 'Unknown'}
                            </motion.p>
                          )}
                          <motion.div
                            whileHover={{ scale: 1.02, y: -2 }}
                            className={`px-4 py-2.5 rounded-2xl text-sm relative group ${
                              isMe
                                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-br-md shadow-[0_4px_15px_rgba(251,191,36,0.4)]'
                                : 'bg-white/10 backdrop-blur-md text-white rounded-bl-md border border-white/10 hover:border-white/20 shadow-lg'
                            }`}
                          >
                            {msg.content}
                            {msg.file_url && (
                              <div className="mt-2">
                                {msg.file_type === 'image' ? (
                                  <img src={msg.file_url} alt="" className="max-w-xs rounded-lg" />
                                ) : msg.file_type === 'video' ? (
                                  <video src={msg.file_url} controls className="max-w-xs rounded-lg" />
                                ) : msg.file_type === 'audio' ? (
                                  <audio src={msg.file_url} controls className="max-w-full" />
                                ) : (
                                  <a href={msg.file_url} target="_blank" className="text-amber-300 underline text-sm break-all">
                                    📎 {msg.file_url.split('/').pop()}
                                  </a>
                                )}
                              </div>
                            )}
                            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-to-r from-amber-400/10 to-orange-400/10" />
                          </motion.div>
                          <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <p className="text-[10px] text-white/50">
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            {isMe && (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="text-[10px]"
                              >
                                {msg.read ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
                                ) : (
                                  <Check className="w-3.5 h-3.5 text-white/40" />
                                )}
                              </motion.span>
                            )}
                            <MessageReactions messageId={msg.id} isMe={isMe} />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </Fragment>
                )
              })}

              {/* Typing Bubble as Message */}
              {isRecipientTyping && (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  className="flex justify-start"
                >
                  <div className="flex gap-3 max-w-[85%] lg:max-w-[60%] items-end">
                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-amber-400 to-orange-400 ring-1 ring-white/20 shadow-lg">
                      {recipient.avatar_url ? (
                        <img src={recipient.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
                          {recipient.full_name?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <p className="text-xs text-white/60 mb-1 ml-1 font-medium">{recipient.full_name || 'Typing...'}</p>
                      <motion.div
                        className="bg-white/10 backdrop-blur-md rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5 shadow-lg border border-white/10"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </LayoutGroup>
          <div ref={bottomRef} />
        </div>

        {/* Input – Fully Transparent with proper mobile gap */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="sticky bottom-0 bg-transparent z-10 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] lg:pb-2"
        >
          <div className="chat-input-container">
            <ChatInput onSend={handleSendMessage} onTypingStart={emitTyping} onTypingStop={emitStopTyping} />
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}