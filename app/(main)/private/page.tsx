'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { Search, User, ArrowRight, MessageCircle, Sparkles } from 'lucide-react'
import { usePresence } from '@/components/providers/PresenceProvider'

type Profile = {
  id: string
  full_name: string | null
  username: string | null
  avatar_url: string | null
}

// ─────────────────────────────────────────
//  Cosmic Background (Nebula, Stars, Shooting Stars, Aurora)
// ─────────────────────────────────────────
const CosmicBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)

  const starsRef = useRef<Array<{ x: number; y: number; r: number; twinkle: number; speed: number }>>([])
  const nebulaeRef = useRef<Array<{ x: number; y: number; rx: number; ry: number; color: string; opacity: number; phase: number; speed: number }>>([])
  const shootingStarsRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; life: number; maxLife: number }>>([])
  const dustRef = useRef<Array<{ x: number; y: number; size: number; vx: number; vy: number; opacity: number }>>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let w = canvas.width = canvas.offsetWidth
    let h = canvas.height = canvas.offsetHeight

    const initScene = () => {
      // Stars
      starsRef.current = Array.from({ length: 200 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h * 0.85,
        r: Math.random() * 2.5 + 0.3,
        twinkle: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.03 + 0.005,
      }))

      // Nebulae (colorful glowing clouds)
      const nebulaColors = [
        { color: '#ff44aa', base: [0.12, 0.06] },
        { color: '#44aaff', base: [0.1, 0.07] },
        { color: '#8844ff', base: [0.1, 0.06] },
        { color: '#ff8844', base: [0.08, 0.05] },
      ]
      nebulaeRef.current = Array.from({ length: 4 }, (_, i) => ({
        x: w * (0.15 + i * 0.2),
        y: h * (0.3 + Math.sin(i * 1.5) * 0.15),
        rx: 80 + Math.random() * 120,
        ry: 40 + Math.random() * 60,
        color: nebulaColors[i].color,
        opacity: nebulaColors[i].base[0],
        phase: Math.random() * Math.PI * 2,
        speed: 0.0005 + Math.random() * 0.001,
      }))

      // Shooting stars
      shootingStarsRef.current = []

      // Cosmic dust particles
      dustRef.current = Array.from({ length: 60 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        size: Math.random() * 2 + 0.5,
        vx: (Math.random() - 0.5) * 0.1,
        vy: (Math.random() - 0.5) * 0.1,
        opacity: Math.random() * 0.3 + 0.1,
      }))
    }
    initScene()

    const drawStars = (time: number) => {
      starsRef.current.forEach(star => {
        star.twinkle += star.speed
        const alpha = 0.3 + Math.sin(star.twinkle) * 0.6
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2)
        ctx.fill()
      })
    }

    const drawNebulae = (time: number) => {
      nebulaeRef.current.forEach(neb => {
        const driftX = Math.sin(time * neb.speed * 0.7 + neb.phase) * 15
        const driftY = Math.cos(time * neb.speed * 0.5 + neb.phase) * 10
        const grad = ctx.createRadialGradient(neb.x + driftX, neb.y + driftY, 0, neb.x + driftX, neb.y + driftY, neb.rx)
        grad.addColorStop(0, neb.color + '80')
        grad.addColorStop(0.4, neb.color + '30')
        grad.addColorStop(1, 'transparent')
        ctx.globalAlpha = neb.opacity * (0.8 + Math.sin(time * 0.0008 + neb.phase) * 0.2)
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.ellipse(neb.x + driftX, neb.y + driftY, neb.rx, neb.ry, 0, 0, Math.PI * 2)
        ctx.fill()
      })
      ctx.globalAlpha = 1
    }

    const drawShootingStars = (time: number) => {
      if (Math.random() < 0.008) {
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
          maxLife: 35 + Math.random() * 25,
        })
      }
      shootingStarsRef.current = shootingStarsRef.current.filter(s => {
        s.life -= 0.025
        if (s.life <= 0) return false
        ctx.strokeStyle = `rgba(255, 255, 255, ${s.life})`
        ctx.lineWidth = 1.8
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

    const drawDust = (time: number) => {
      dustRef.current.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        if (p.x < -10 || p.x > w + 10) p.vx *= -1
        if (p.y < -10 || p.y > h + 10) p.vy *= -1
        ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      })
    }

    const drawAuroraWaves = (time: number) => {
      // Subtle aurora at bottom
      for (let i = 0; i < 2; i++) {
        ctx.save()
        ctx.globalAlpha = 0.04
        ctx.beginPath()
        const baseY = h * 0.65 + i * 50
        ctx.moveTo(0, baseY)
        for (let x = 0; x <= w; x += 10) {
          const y = baseY + Math.sin(x * 0.01 + time * 0.002 + i) * 25 + Math.cos(x * 0.005 + time * 0.001) * 15
          ctx.lineTo(x, y)
        }
        ctx.lineTo(w, h)
        ctx.lineTo(0, h)
        ctx.closePath()
        const colors = ['#00ff88', '#4488ff']
        const grad = ctx.createLinearGradient(0, baseY - 30, 0, baseY + 30)
        grad.addColorStop(0, colors[i] + '00')
        grad.addColorStop(0.5, colors[i] + '60')
        grad.addColorStop(1, colors[i] + '00')
        ctx.fillStyle = grad
        ctx.fill()
        ctx.restore()
      }
    }

    const animate = (time: number) => {
      ctx.clearRect(0, 0, w, h)

      // Deep space gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h)
      skyGrad.addColorStop(0, '#05050f')
      skyGrad.addColorStop(0.5, '#0e1424')
      skyGrad.addColorStop(1, '#1a1030')
      ctx.fillStyle = skyGrad
      ctx.fillRect(0, 0, w, h)

      drawNebulae(time)
      drawStars(time)
      drawShootingStars(time)
      drawDust(time)
      drawAuroraWaves(time)

      animFrameRef.current = requestAnimationFrame(animate)
    }

    animFrameRef.current = requestAnimationFrame(animate)

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

export default function PrivateChatsPage() {
  const { user } = useAuth()
  const supabase = useMemo(() => createClient(), [])
  const { onlineUsers } = usePresence()

  const [profiles, setProfiles] = useState<Profile[]>([])
  const [search, setSearch] = useState('')
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    const fetchProfiles = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .neq('id', user?.id)
        .order('full_name', { ascending: true })
      if (data) setProfiles(data)
    }
    if (user) fetchProfiles()
  }, [user, supabase])

  const fetchUnreadCounts = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('private_messages')
      .select('sender_id')
      .eq('receiver_id', user.id)
      .eq('read', false)
    if (!data) return
    const counts: Record<string, number> = {}
    data.forEach((msg: { sender_id: string }) => {
      counts[msg.sender_id] = (counts[msg.sender_id] || 0) + 1
    })
    setUnreadCounts(counts)
  }, [user, supabase])

  useEffect(() => { fetchUnreadCounts() }, [fetchUnreadCounts])

  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('unread-private-list-cosmic')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'private_messages', filter: `receiver_id=eq.${user.id}` }, () => fetchUnreadCounts())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'private_messages', filter: `receiver_id=eq.${user.id}` }, () => fetchUnreadCounts())
      .subscribe()
    return () => { channel.unsubscribe() }
  }, [user, supabase, fetchUnreadCounts])

  const filtered = profiles.filter(p =>
    p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.username?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0a0a1a]">
      <style>{`
        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 10px; }
      `}</style>

      <CosmicBackground />

      <div className="relative z-10 flex flex-col h-full">
        {/* Header – Fully Transparent */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="p-4 lg:p-6 bg-transparent sticky top-0 z-20"
        >
          <div className="flex items-center gap-3 mb-5">
            <motion.div
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            >
              <MessageCircle className="w-8 h-8 text-emerald-300 drop-shadow-[0_0_12px_rgba(0,255,136,0.4)]" />
            </motion.div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-300 via-blue-300 to-purple-300 bg-clip-text text-transparent leading-tight">
                Private Chats
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">Connect with the cosmos</p>
            </div>
          </div>

          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="relative"
          >
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 transition-colors group-focus-within:text-emerald-400" />
            <input
              type="text"
              placeholder="Search by name or username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/40 text-white placeholder-gray-500 transition-all duration-300 backdrop-blur-sm"
            />
          </motion.div>
        </motion.div>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] lg:px-6 space-y-3 scrollbar-thin">
          <LayoutGroup>
            <AnimatePresence mode="popLayout">
              {filtered.map((profile, index) => {
                const isOnline = onlineUsers.has(profile.id)
                const unread = unreadCounts[profile.id] || 0

                return (
                  <motion.div
                    key={profile.id}
                    layout
                    initial={{ opacity: 0, x: -40, scale: 0.92 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95, x: 20, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.45, delay: index * 0.03, type: 'spring', stiffness: 180, damping: 18 }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Link href={`/private/${profile.id}`}>
                      <div className="flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/40 rounded-2xl transition-all cursor-pointer group relative overflow-hidden shadow-lg hover:shadow-[0_0_20px_rgba(0,255,136,0.1)]">
                        {/* Animated background glow on hover */}
                        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-purple-500/10" />
                        
                        <div className="relative flex-shrink-0">
                          <motion.div
                            className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white font-bold text-lg ring-2 ring-white/20 group-hover:ring-emerald-400/70 transition-all"
                            whileHover={{ rotate: 8, scale: 1.08 }}
                          >
                            {profile.avatar_url ? (
                              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                            ) : (
                              profile.full_name?.[0]?.toUpperCase() || <User className="h-6 w-6" />
                            )}
                          </motion.div>
                          {isOnline && (
                            <motion.span
                              animate={{ scale: [1, 1.4, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-[#0a0a1a] rounded-full shadow-[0_0_10px_rgba(74,222,128,0.7)]"
                            />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold truncate text-base group-hover:text-emerald-200 transition-colors">
                            {profile.full_name || 'Unknown'}
                          </p>
                          <p className="text-sm truncate flex items-center gap-1.5">
                            <span className="text-gray-400">@{profile.username || 'user'}</span>
                            {isOnline ? (
                              <span className="text-emerald-400 text-xs flex items-center gap-1 ml-1">
                                <Sparkles className="w-3 h-3" /> Online
                              </span>
                            ) : (
                              <span className="text-gray-600 text-xs">• offline</span>
                            )}
                          </p>
                        </div>

                        {unread > 0 && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="bg-gradient-to-r from-emerald-500 to-blue-500 text-white text-xs font-bold rounded-full px-3 py-1 min-w-[28px] text-center shadow-[0_0_15px_rgba(0,255,136,0.5)]"
                          >
                            {unread > 99 ? '99+' : unread}
                          </motion.span>
                        )}

                        <motion.div
                          className="text-gray-500 group-hover:text-emerald-400 transition-colors"
                          whileHover={{ x: 4 }}
                        >
                          <ArrowRight className="h-5 w-5" />
                        </motion.div>
                      </div>
                    </Link>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </LayoutGroup>

          {filtered.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="text-6xl mb-4 opacity-40"
              >
                🌌
              </motion.div>
              <p className="text-lg text-gray-400 font-medium">
                {search ? 'No users found in this galaxy' : 'No conversations yet'}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {search ? 'Try a different search term' : 'Start a new cosmic connection'}
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}