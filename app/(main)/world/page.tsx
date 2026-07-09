'use client'

import { useState, useEffect, useRef, Fragment, useMemo, useCallback } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { Globe, Users, Zap } from 'lucide-react'
import { useTypingIndicator } from '@/lib/hooks/useTypingIndicator'
import ChatInput from '@/components/chat/ChatInput'
import MessageReactions from '@/components/chat/MessageReactions'

type WorldMessage = {
  id: number
  sender_id: string
  content: string | null
  file_url: string | null
  file_type: string | null
  thumbnail_url: string | null
  created_at: string
  profiles: {
    full_name: string | null
    avatar_url: string | null
  } | null
}

// ─────────────────────────────────────────
//  Night Sky Background (Moon, Stars, Rain)
// ─────────────────────────────────────────
const NightSkyBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>(0)

  const starsRef = useRef<Array<{ x: number; y: number; radius: number; brightness: number; speed: number }>>([])
  const rainDropsRef = useRef<Array<{ x: number; y: number; length: number; speed: number; opacity: number }>>([])
  const shootingStarsRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; life: number; maxLife: number }>>([])

  const init = useCallback((width: number, height: number) => {
    const starCount = 180
    starsRef.current = Array.from({ length: starCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height * 0.8,
      radius: Math.random() * 2.5 + 0.5,
      brightness: Math.random() * 0.9 + 0.1,
      speed: Math.random() * 0.03 + 0.005
    }))

    rainDropsRef.current = Array.from({ length: 120 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      length: Math.random() * 25 + 5,
      speed: Math.random() * 5 + 3,
      opacity: Math.random() * 0.4 + 0.2
    }))

    shootingStarsRef.current = []
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let w = canvas.width = canvas.offsetWidth
    let h = canvas.height = canvas.offsetHeight
    init(w, h)

    const drawSky = (ctx: CanvasRenderingContext2D) => {
      const gradient = ctx.createLinearGradient(0, 0, 0, h)
      gradient.addColorStop(0, '#0b0f19')
      gradient.addColorStop(0.5, '#1a1c3b')
      gradient.addColorStop(1, '#2d1b4e')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, w, h)
    }

    const drawStars = (ctx: CanvasRenderingContext2D, time: number) => {
      starsRef.current.forEach(star => {
        const twinkle = Math.sin(time * star.speed * 10 + star.x) * 0.3 + 0.7
        ctx.globalAlpha = star.brightness * twinkle
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2)
        ctx.fill()
      })
      ctx.globalAlpha = 1
    }

    const drawMoon = (ctx: CanvasRenderingContext2D, time: number) => {
      const moonX = w * 0.82
      const moonY = h * 0.18
      const radius = 60

      ctx.globalAlpha = 0.12
      const glowGradient = ctx.createRadialGradient(moonX, moonY, radius * 0.8, moonX, moonY, radius * 2.5)
      glowGradient.addColorStop(0, '#fde68a')
      glowGradient.addColorStop(1, 'transparent')
      ctx.fillStyle = glowGradient
      ctx.beginPath()
      ctx.arc(moonX, moonY, radius * 2.5, 0, Math.PI * 2)
      ctx.fill()

      ctx.globalAlpha = 1
      ctx.fillStyle = '#fef3c7'
      ctx.beginPath()
      ctx.arc(moonX, moonY, radius, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#e5d09e'
      ctx.beginPath()
      ctx.arc(moonX - 15, moonY - 10, 10, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(moonX + 20, moonY + 15, 15, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(moonX + 10, moonY - 20, 8, 0, Math.PI * 2)
      ctx.fill()
    }

    const drawShootingStars = (ctx: CanvasRenderingContext2D, time: number) => {
      if (Math.random() < 0.004) {
        const startX = Math.random() * w
        const startY = Math.random() * h * 0.5
        const angle = Math.random() * 0.5 + 0.2
        const speed = Math.random() * 5 + 2
        shootingStarsRef.current.push({
          x: startX,
          y: startY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          maxLife: 50 + Math.random() * 30
        })
      }
      shootingStarsRef.current = shootingStarsRef.current.filter(s => {
        s.life -= 0.025
        if (s.life <= 0) return false
        const alpha = s.life
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(s.x, s.y)
        const endX = s.x + s.vx * 12
        const endY = s.y + s.vy * 12
        ctx.lineTo(endX, endY)
        ctx.stroke()
        s.x += s.vx
        s.y += s.vy
        return true
      })
    }

    const drawRain = (ctx: CanvasRenderingContext2D, time: number) => {
      ctx.strokeStyle = '#a5b4fc'
      rainDropsRef.current.forEach(drop => {
        ctx.globalAlpha = drop.opacity
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(drop.x, drop.y)
        ctx.lineTo(drop.x - 1, drop.y + drop.length)
        ctx.stroke()
        drop.y += drop.speed
        if (drop.y > h + drop.length) {
          drop.y = -drop.length
          drop.x = Math.random() * w
        }
      })
      ctx.globalAlpha = 1
    }

    const animate = (time: number) => {
      ctx.clearRect(0, 0, w, h)
      drawSky(ctx)
      drawStars(ctx, time)
      drawMoon(ctx, time)
      drawShootingStars(ctx, time)
      drawRain(ctx, time)
      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    const handleResize = () => {
      w = canvas.width = canvas.offsetWidth
      h = canvas.height = canvas.offsetHeight
      init(w, h)
    }
    window.addEventListener('resize', handleResize)
    return () => {
      cancelAnimationFrame(animationFrameRef.current)
      window.removeEventListener('resize', handleResize)
    }
  }, [init])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
}

export default function WorldChatPage() {
  const [messages, setMessages] = useState<WorldMessage[]>([])
  const { user, profile } = useAuth()
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = useMemo(() => createClient(), [])

  const channelName = 'world-chat-typing'
  const { typingUsers, emitTyping, emitStopTyping } = useTypingIndicator(
    channelName,
    user?.id || '',
    profile?.full_name || 'Someone'
  )

  // Fetch initial messages
  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('world_messages')
        .select('*, profiles(full_name, avatar_url)')
        .order('created_at', { ascending: true })
        .limit(100)
      if (data) setMessages(data)
    }
    fetchMessages()
  }, [supabase])

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('world-chat')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'world_messages' },
        (payload) => {
          const newMessage = payload.new as WorldMessage
          fetchProfileForMessage(newMessage)
        }
      )
      .subscribe()

    const fetchProfileForMessage = async (msg: WorldMessage) => {
      const { data: sender } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', msg.sender_id)
        .single()
      setMessages(prev => [...prev, { ...msg, profiles: sender }])
    }

    return () => { channel.unsubscribe() }
  }, [supabase])

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typingUsers]) // typingUsers change par bhi scroll hoga

  const handleSend = async (payload: {
    content: string
    file?: { url: string; type: string; thumbnail_url?: string }
  }) => {
    if (!user) return
    const msgData = {
      sender_id: user.id,
      content: payload.content || null,
      file_url: payload.file?.url || null,
      file_type: payload.file?.type || null,
      thumbnail_url: payload.file?.thumbnail_url || null,
    }
    const { error } = await supabase.from('world_messages').insert(msgData)
    if (error) console.error(error)
    else emitStopTyping()
  }

  useEffect(() => {
    return () => { emitStopTyping() }
  }, [emitStopTyping])

  // Build a map of sender profiles for typing indicator
  const [typingProfiles, setTypingProfiles] = useState<Record<string, { full_name: string | null; avatar_url: string | null }>>({})

  useEffect(() => {
    const userIds = Array.from(typingUsers.keys())
    if (userIds.length === 0) return
    const fetchProfiles = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds)
      if (data) {
        const map: Record<string, any> = {}
        data.forEach(p => { map[p.id] = p })
        setTypingProfiles(map)
      }
    }
    fetchProfiles()
  }, [typingUsers, supabase])

  let lastDate = ''

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0b0f19]">
      <style>{`
        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { 
          background: rgba(255,255,255,0.1); 
          border-radius: 10px; 
        }
        /* Ensure ChatInput's internal background is transparent */
        .chat-input-wrapper [class*="bg-"] {
          background: transparent !important;
        }
      `}</style>

      <NightSkyBackground />

      <div className="relative z-10 flex flex-col h-full">
        {/* ---- HEADER (fully transparent, no blur, no border) ---- */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="p-4 bg-transparent sticky top-0 z-20 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            >
              <Globe className="w-8 h-8 text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                World Chat
              </h1>
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>Everyone online</span>
              </p>
            </div>
          </div>
          <motion.div
            className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10"
            whileHover={{ scale: 1.05 }}
          >
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-medium text-gray-200">Live</span>
            <span className="w-2 h-2 rounded-full bg-green-400 animate-ping" />
          </motion.div>
        </motion.div>

        {/* ---- MESSAGES (typing indicator inside) ---- */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          <LayoutGroup>
            <AnimatePresence mode="popLayout">
              {messages.map((msg) => {
                const msgDate = new Date(msg.created_at).toLocaleDateString([], {
                  day: 'numeric', month: 'short', year: 'numeric'
                })
                const showDate = msgDate !== lastDate
                if (showDate) lastDate = msgDate

                const isMe = msg.sender_id === user?.id
                const senderProfile = isMe
                  ? { full_name: profile?.full_name || null, avatar_url: profile?.avatar_url || null }
                  : msg.profiles

                return (
                  <Fragment key={msg.id}>
                    {showDate && (
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                        className="flex justify-center my-4"
                      >
                        <span className="px-5 py-2 text-xs font-semibold uppercase tracking-wider text-gray-300 bg-white/5 border border-white/10 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.2)] backdrop-blur-sm">
                          {msgDate}
                        </span>
                      </motion.div>
                    )}

                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                      transition={{ duration: 0.3, type: 'spring', stiffness: 260, damping: 20 }}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                      whileHover={{ scale: 1.01 }}
                    >
                      <div className={`flex gap-3 max-w-[85%] lg:max-w-[60%] ${isMe ? 'flex-row-reverse' : ''}`}>
                        <motion.div
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-blue-500 to-purple-600 ring-2 ring-white/20 shadow-lg"
                        >
                          {senderProfile?.avatar_url ? (
                            <img
                              src={senderProfile.avatar_url} alt=""
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
                              {senderProfile?.full_name?.[0]?.toUpperCase() || '?'}
                            </div>
                          )}
                        </motion.div>
                        <div className="flex flex-col">
                          {!isMe && (
                            <motion.p
                              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                              transition={{ delay: 0.2 }}
                              className="text-xs text-gray-400 mb-1 ml-1 font-medium"
                            >
                              {senderProfile?.full_name || 'Unknown'}
                            </motion.p>
                          )}
                          <motion.div
                            className={`px-4 py-2.5 rounded-2xl text-sm relative group ${
                              isMe
                                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-br-md shadow-[0_4px_12px_rgba(59,130,246,0.3)]'
                                : 'bg-white/10 backdrop-blur-sm text-white rounded-bl-md border border-white/10 hover:border-white/20 shadow-[0_4px_12px_rgba(255,255,255,0.05)]'
                            }`}
                            whileHover={{ scale: 1.02, y: -2 }}
                            transition={{ type: 'spring', stiffness: 400 }}
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
                                  <a href={msg.file_url} target="_blank" className="text-blue-400 underline text-sm break-all">
                                    📎 {msg.file_url.split('/').pop()}
                                  </a>
                                )}
                              </div>
                            )}
                            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-to-r from-blue-400/10 to-purple-400/10" />
                          </motion.div>
                          <div className="flex items-center gap-1 mt-1">
                            <p className="text-[10px] text-gray-500 ml-1">
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <MessageReactions messageId={msg.id} isMe={isMe} />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </Fragment>
                )
              })}

              {/* ---- TYPING INDICATOR as message bubbles ---- */}
              {Array.from(typingUsers.values()).map((tu) => {
                const senderProfile = typingProfiles[tu.userId]
                return (
                  <motion.div
                    key={`typing-${tu.userId}`}
                    layout
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="flex justify-start"
                  >
                    <div className="flex gap-3 max-w-[85%] lg:max-w-[60%] items-end">
                      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-blue-500 to-purple-600 ring-2 ring-white/20 shadow-lg">
                        {senderProfile?.avatar_url ? (
                          <img
                            src={senderProfile.avatar_url}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
                            {tu.name?.[0]?.toUpperCase() || '?'}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <p className="text-xs text-gray-400 mb-1 ml-1 font-medium">{tu.name}</p>
                        <motion.div
                          className="bg-white/10 backdrop-blur-sm rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5 shadow-lg shadow-blue-500/5 border border-white/10"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        >
                          <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </motion.div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </LayoutGroup>
          <div ref={bottomRef} />
        </div>

        {/* ---- CHAT INPUT (fully transparent, correct gap) ---- */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="sticky bottom-0 bg-transparent z-10 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] lg:pb-2"
        >
          <div className="chat-input-wrapper">
            <ChatInput onSend={handleSend} onTypingStart={emitTyping} onTypingStop={emitStopTyping} />
          </div>
        </motion.div>
      </div>
    </div>
  )
}