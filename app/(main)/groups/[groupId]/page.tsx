'use client'

import { useState, useEffect, useRef, useCallback, useMemo, Fragment } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { Loader2, ArrowLeft, Info, CheckCheck, Circle, X, Download, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { usePresence } from '@/components/providers/PresenceProvider'
import { useTypingIndicator } from '@/lib/hooks/useTypingIndicator'
import ChatInput from '@/components/chat/ChatInput'
import MessageReactions from '@/components/chat/MessageReactions'
import GroupInfoPanel from '@/components/chat/GroupInfoPanel'

type GroupMessage = {
  id: number
  group_id: string
  sender_id: string
  content: string | null
  created_at: string
  file_url?: string | null
  file_type?: string | null
  thumbnail_url?: string | null
  read_by: string[]
  profiles: {
    full_name: string | null
    avatar_url: string | null
  } | null
}

type GroupDetails = {
  id: string
  name: string
  created_by: string
  avatar_url: string | null
  member_ids: string[]
  admin_ids: string[]
}

// ─────────────────────────────────────────
//  Nebula & Shooting Stars Background
// ─────────────────────────────────────────
const ChatBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)
  const starsRef = useRef<Array<{ x: number; y: number; r: number; twinkle: number; speed: number }>>([])
  const nebulaeRef = useRef<Array<{ x: number; y: number; rx: number; ry: number; color: string; opacity: number; phase: number; speed: number }>>([])
  const shootingStarsRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; life: number }>>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let w = canvas.width = canvas.offsetWidth
    let h = canvas.height = canvas.offsetHeight

    const initScene = () => {
      starsRef.current = Array.from({ length: 200 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h * 0.8,
        r: Math.random() * 2.5 + 0.3,
        twinkle: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.03 + 0.005,
      }))
      const colors = ['#ff44aa', '#44aaff', '#8844ff', '#ff8844']
      nebulaeRef.current = Array.from({ length: 4 }, (_, i) => ({
        x: w * (0.2 + i * 0.2),
        y: h * (0.3 + Math.sin(i * 1.5) * 0.15),
        rx: 70 + Math.random() * 100,
        ry: 35 + Math.random() * 50,
        color: colors[i],
        opacity: 0.08 + Math.random() * 0.07,
        phase: Math.random() * Math.PI * 2,
        speed: 0.0005 + Math.random() * 0.001,
      }))
      shootingStarsRef.current = []
    }
    initScene()

    const draw = (time: number) => {
      ctx.clearRect(0, 0, w, h)
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h)
      skyGrad.addColorStop(0, '#0b0815')
      skyGrad.addColorStop(1, '#1a1530')
      ctx.fillStyle = skyGrad
      ctx.fillRect(0, 0, w, h)

      // Stars
      starsRef.current.forEach(star => {
        star.twinkle += star.speed
        const alpha = 0.3 + Math.sin(star.twinkle) * 0.6
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2)
        ctx.fill()
      })

      // Nebulae
      nebulaeRef.current.forEach(neb => {
        const driftX = Math.sin(time * neb.speed * 0.7 + neb.phase) * 15
        const driftY = Math.cos(time * neb.speed * 0.5 + neb.phase) * 10
        const grad = ctx.createRadialGradient(neb.x + driftX, neb.y + driftY, 0, neb.x + driftX, neb.y + driftY, neb.rx)
        grad.addColorStop(0, neb.color + '80')
        grad.addColorStop(0.5, neb.color + '20')
        grad.addColorStop(1, 'transparent')
        ctx.globalAlpha = neb.opacity
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.ellipse(neb.x + driftX, neb.y + driftY, neb.rx, neb.ry, 0, 0, Math.PI * 2)
        ctx.fill()
      })
      ctx.globalAlpha = 1

      // Shooting stars
      if (Math.random() < 0.006) {
        const startX = Math.random() * w
        const startY = Math.random() * h * 0.5
        const angle = Math.random() * 0.6 + 0.15
        const speed = Math.random() * 6 + 4
        shootingStarsRef.current.push({
          x: startX,
          y: startY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
        })
      }
      shootingStarsRef.current = shootingStarsRef.current.filter(s => {
        s.life -= 0.02
        if (s.life <= 0) return false
        ctx.strokeStyle = `rgba(255, 255, 255, ${s.life})`
        ctx.lineWidth = 1.8
        ctx.beginPath()
        ctx.moveTo(s.x, s.y)
        ctx.lineTo(s.x + s.vx * 10, s.y + s.vy * 10)
        ctx.stroke()
        s.x += s.vx
        s.y += s.vy
        return true
      })

      animFrameRef.current = requestAnimationFrame(draw)
    }

    animFrameRef.current = requestAnimationFrame(draw)

    const handleResize = () => {
      w = canvas.width = canvas.offsetWidth
      h = canvas.height = canvas.offsetHeight
      initScene()
    }
    window.addEventListener('resize', handleResize)
    return () => {
      cancelAnimationFrame(animFrameRef.current)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
}

// ─────────────────────────────────────────
//  🖼️ Image Lightbox
// ─────────────────────────────────────────
const ImageLightbox = ({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) => {
  const downloadImage = () => {
    const link = document.createElement('a')
    link.href = src
    link.download = alt || 'downloaded-image'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        className="relative max-w-[90vw] max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-4 -right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur transition"
          aria-label="Close preview"
        >
          <X className="w-5 h-5" />
        </button>
        <img
          src={src}
          alt={alt || 'Preview'}
          className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl"
        />
        <button
          onClick={downloadImage}
          className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-full shadow-lg transition"
        >
          <Download className="w-4 h-4" />
          Download
        </button>
      </motion.div>
    </motion.div>
  )
}

export default function GroupChatPage() {
  const { groupId } = useParams<{ groupId: string }>()
  const { user, profile: myProfile } = useAuth()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const { onlineUsers } = usePresence()

  const channelName = `group-typing-${groupId}`
  const { typingUsers, emitTyping, emitStopTyping } = useTypingIndicator(
    channelName,
    user?.id || '',
    myProfile?.full_name || 'Me'
  )

  const [messages, setMessages] = useState<GroupMessage[]>([])
  const [group, setGroup] = useState<GroupDetails | null>(null)
  const [members, setMembers] = useState<any[]>([])
  const [showInfo, setShowInfo] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // ── Lightbox & Delete states ──
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const [lightboxAlt, setLightboxAlt] = useState<string>('')
  const [deleteMessageId, setDeleteMessageId] = useState<number | null>(null)

  const fetchMembersFromIds = async (memberIds: string[]) => {
    if (!memberIds.length) return []
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url')
      .in('id', memberIds)
    return profiles || []
  }

  useEffect(() => {
    if (!groupId) return
    const fetchGroup = async () => {
      const { data } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single()
      if (data) {
        setGroup(data)
        const memberProfiles = await fetchMembersFromIds(data.member_ids)
        setMembers(memberProfiles)
      } else {
        router.replace('/groups')
      }
    }
    fetchGroup()
  }, [groupId, supabase, router])

  useEffect(() => {
    if (!groupId || !user) return
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('group_messages')
        .select('*, profiles!inner(full_name, avatar_url)')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true })
        .limit(100)
      if (data) setMessages(data)
    }
    fetchMessages()
  }, [groupId, user, supabase])

  // Mark as read RPC
  const markAsRead = useCallback(async () => {
    if (!user || !groupId) return
    const { error } = await supabase.rpc('mark_group_messages_read', {
      p_group_id: groupId,
      p_user_id: user.id
    })
    if (!error) {
      setMessages(prev =>
        prev.map(msg => {
          if (msg.read_by.includes(user.id) || msg.sender_id === user.id) return msg
          return { ...msg, read_by: [...msg.read_by, user.id] }
        })
      )
    }
  }, [user, groupId, supabase])

  useEffect(() => {
    markAsRead()
  }, [markAsRead])

  // Real‑time subscription (INSERT, UPDATE, DELETE)
  useEffect(() => {
    if (!groupId || !user) return
    const channel = supabase
      .channel(`group-${groupId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${groupId}` },
        async (payload) => {
          const newMsg = payload.new as GroupMessage
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', newMsg.sender_id)
            .single()
          setMessages(prev => [...prev, { ...newMsg, profiles: senderProfile }])
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'group_messages', filter: `group_id=eq.${groupId}` },
        (payload) => {
          const updated = payload.new as GroupMessage
          setMessages(prev =>
            prev.map(msg => (msg.id === updated.id ? { ...msg, read_by: updated.read_by } : msg))
          )
        }
      )
      // ── NEW: DELETE listener ──
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'group_messages', filter: `group_id=eq.${groupId}` },
        (payload) => {
          const deletedId = (payload.old as GroupMessage).id
          setMessages(prev => prev.filter(msg => msg.id !== deletedId))
        }
      )
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [groupId, user, supabase])

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typingUsers])

  useEffect(() => {
    return () => { emitStopTyping() }
  }, [emitStopTyping])

  const handleSend = async (payload: { content: string; file?: { url: string; type: string; thumbnail_url?: string } }) => {
    if (!user || !groupId) return
    const msgData = {
      group_id: groupId,
      sender_id: user.id,
      content: payload.content || null,
      file_url: payload.file?.url || null,
      file_type: payload.file?.type || null,
      thumbnail_url: payload.file?.thumbnail_url || null,
      read_by: [user.id],
    }
    const { error } = await supabase.from('group_messages').insert(msgData)
    if (!error) emitStopTyping()
    else console.error(error)
  }

  // ── NEW: Delete message handler ──
  const handleDeleteMessage = async (messageId: number) => {
    const { error } = await supabase.from('group_messages').delete().eq('id', messageId)
    if (error) {
      console.error('Delete failed:', error)
      return
    }
    // Optimistic removal (real‑time listener will sync for others)
    setMessages(prev => prev.filter(msg => msg.id !== messageId))
    setDeleteMessageId(null)
  }

  if (!group) {
    return (
      <div className="flex items-center justify-center h-full bg-[#0b0815]">
        <Loader2 className="animate-spin h-8 w-8 text-purple-400" />
      </div>
    )
  }

  const othersTyping = Array.from(typingUsers.values()).filter(tu => tu.userId !== user?.id)
  const onlineCount = members.filter(m => Array.from(onlineUsers).includes(m.id)).length

  return (
    <div className="relative h-full w-full overflow-hidden">
      <style>{`
        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
      `}</style>

      <ChatBackground />

      <div className="relative z-10 flex flex-col h-full">
        {/* Header – Transparent */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="p-3 px-4 bg-transparent flex items-center gap-3 sticky top-0 z-20"
        >
          <Link href="/groups">
            <motion.div whileHover={{ scale: 1.1, x: -2 }} whileTap={{ scale: 0.9 }} className="p-1 hover:bg-white/10 rounded-lg transition">
              <ArrowLeft className="h-5 w-5 text-gray-300" />
            </motion.div>
          </Link>

          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg overflow-hidden ring-2 ring-white/10 shadow-lg">
            {group.avatar_url ? (
              <img src={group.avatar_url} className="w-full h-full object-cover" alt="" />
            ) : (
              group.name[0]?.toUpperCase()
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white truncate">{group.name}</p>
            <p className="text-xs text-gray-400 flex items-center gap-1">
              {onlineCount > 0 && <Circle className="h-2 w-2 fill-green-500 text-green-500" />}
              {onlineCount > 0 ? `${onlineCount} online, ` : ''}
              {members.length} members
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowInfo(true)}
            className="p-2 hover:bg-white/10 rounded-xl transition"
          >
            <Info className="h-5 w-5 text-gray-300" />
          </motion.button>
        </motion.div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          <LayoutGroup>
            <AnimatePresence mode="popLayout">
              {messages.map((msg) => {
                const isMe = msg.sender_id === user?.id
                const sender = msg.profiles

                const isImage = msg.file_type === 'image'
                const openLightbox = () => {
                  if (isImage && msg.file_url) {
                    setLightboxSrc(msg.file_url)
                    setLightboxAlt(msg.content || 'Image')
                  }
                }

                return (
                  <motion.div
                    key={msg.id}
                    layout
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                    whileHover={{ scale: 1.01 }}
                  >
                    <div className={`flex gap-3 max-w-[85%] md:max-w-[70%] lg:max-w-[60%] ${isMe ? 'flex-row-reverse' : ''}`}>
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-lg overflow-hidden"
                      >
                        {sender?.avatar_url ? (
                          <img src={sender.avatar_url} className="w-full h-full object-cover" alt="" />
                        ) : (
                          sender?.full_name?.[0]?.toUpperCase() || '?'
                        )}
                      </motion.div>

                      <div className="relative group">
                        {!isMe && (
                          <p className="text-xs text-gray-400 mb-1 ml-1 font-medium">
                            {sender?.full_name || 'Unknown'}
                          </p>
                        )}
                        <motion.div
                          whileHover={{ scale: 1.02, y: -2 }}
                          className={`px-4 py-2.5 rounded-2xl text-sm shadow-lg relative ${
                            isMe
                              ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-br-md'
                              : 'bg-white/10 backdrop-blur-sm text-white rounded-bl-md border border-white/10'
                          }`}
                          onContextMenu={(e) => {
                            if (isMe) {
                              e.preventDefault();
                              setDeleteMessageId(msg.id);
                            }
                          }}
                        >
                          {msg.content}

                          {/* Attachments – improved responsiveness */}
                          {msg.file_url && (
                            <div className={`mt-2 ${msg.content ? 'border-t border-white/10 pt-2' : ''}`}>
                              {isImage && (
                                <div onClick={openLightbox} className="cursor-pointer group/image relative overflow-hidden rounded-xl">
                                  <img
                                    src={msg.thumbnail_url || msg.file_url}
                                    alt={msg.content || 'Image'}
                                    className="max-w-full max-h-64 object-contain rounded-xl hover:scale-105 transition-transform duration-300"
                                    loading="lazy"
                                  />
                                  <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/20 flex items-center justify-center transition">
                                    <span className="text-white opacity-0 group-hover/image:opacity-100 text-xs bg-black/50 px-2 py-1 rounded-full">
                                      Click to view
                                    </span>
                                  </div>
                                </div>
                              )}

                              {msg.file_type === 'video' && (
                                <video src={msg.file_url} controls className="max-w-full max-h-64 rounded-xl" preload="metadata" />
                              )}

                              {msg.file_type === 'audio' && (
                                <audio src={msg.file_url} controls className="max-w-full" />
                              )}

                              {!isImage && msg.file_type !== 'video' && msg.file_type !== 'audio' && (
                                <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-300 underline text-sm break-all">
                                  📎 {msg.file_url.split('/').pop()}
                                </a>
                              )}
                            </div>
                          )}

                          {/* Desktop delete icon (only for own messages) */}
                          {isMe && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteMessageId(msg.id);
                              }}
                              className="absolute -top-2 -right-2 p-1 bg-red-500/90 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
                              aria-label="Delete message"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </motion.div>

                        <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <p className="text-[10px] text-gray-500">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          {isMe && (
                            <span className="text-[10px] text-blue-400 flex items-center gap-0.5">
                              {msg.read_by.filter(id => id !== user?.id).length > 0 ? (
                                <>
                                  <CheckCheck className="h-3 w-3" />
                                  {msg.read_by.filter(id => id !== user?.id).length}
                                </>
                              ) : (
                                <Circle className="h-2 w-2 fill-gray-500 text-gray-500" />
                              )}
                            </span>
                          )}
                          <MessageReactions messageId={msg.id} isMe={isMe} />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}

              {/* Typing Indicator Bubble */}
              {othersTyping.length > 0 && (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  className="flex justify-start"
                >
                  <div className="flex gap-3 max-w-[85%] lg:max-w-[60%] items-end">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-lg overflow-hidden">
                      {othersTyping[0]?.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex flex-col">
                      <p className="text-xs text-gray-400 mb-1 ml-1 font-medium">
                        {othersTyping.map(tu => tu.name).join(', ')} typing...
                      </p>
                      <motion.div
                        className="bg-white/10 backdrop-blur-sm rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5 shadow-lg border border-white/10"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </LayoutGroup>
          <div ref={bottomRef} />
        </div>

        {/* Input – Transparent + upgraded ChatInput */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="sticky bottom-0 bg-transparent z-10 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] lg:pb-2"
        >
          <ChatInput onSend={handleSend} onTypingStart={emitTyping} onTypingStop={emitStopTyping} />
        </motion.div>

        {/* Group Info Side Panel */}
        <GroupInfoPanel groupId={groupId} isOpen={showInfo} onClose={() => setShowInfo(false)} />
      </div>

      {/* ── Lightbox Modal ── */}
      <AnimatePresence>
        {lightboxSrc && (
          <ImageLightbox
            src={lightboxSrc}
            alt={lightboxAlt}
            onClose={() => {
              setLightboxSrc(null)
              setLightboxAlt('')
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Delete Confirmation Modal ── */}
      <AnimatePresence>
        {deleteMessageId !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => setDeleteMessageId(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-gray-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-white mb-2">Delete message?</h3>
              <p className="text-gray-400 text-sm mb-6">
                This action cannot be undone. The message will be removed for everyone in the group.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteMessageId(null)}
                  className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteMessage(deleteMessageId)}
                  className="px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white transition"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}