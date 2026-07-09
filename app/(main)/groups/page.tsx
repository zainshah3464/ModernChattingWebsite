'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { Plus, Users, MessageSquare, Sparkles, Search } from 'lucide-react'
import { usePresence } from '@/components/providers/PresenceProvider'

type Group = {
  id: string
  name: string
  created_by: string
  avatar_url: string | null
  member_ids: string[]
  admin_ids: string[]
  created_at: string
}

// ─────────────────────────────────────────
//  Cosmic Orbs & Stars Background
// ─────────────────────────────────────────
const GroupsBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)
  const starsRef = useRef<Array<{ x: number; y: number; r: number; twinkle: number; speed: number }>>([])
  const orbsRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; r: number; color: string; opacity: number }>>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let w = canvas.width = canvas.offsetWidth
    let h = canvas.height = canvas.offsetHeight

    const initScene = () => {
      // Stars
      starsRef.current = Array.from({ length: 150 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h * 0.8,
        r: Math.random() * 2 + 0.3,
        twinkle: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.03 + 0.005,
      }))
      // Glowing orbs
      const colors = ['#a78bfa', '#818cf8', '#c084fc', '#f472b6', '#60a5fa']
      orbsRef.current = Array.from({ length: 6 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        r: Math.random() * 80 + 40,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: Math.random() * 0.15 + 0.05,
      }))
    }
    initScene()

    const draw = (time: number) => {
      ctx.clearRect(0, 0, w, h)

      // Deep space gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h)
      skyGrad.addColorStop(0, '#0a0818')
      skyGrad.addColorStop(1, '#1e1636')
      ctx.fillStyle = skyGrad
      ctx.fillRect(0, 0, w, h)

      // Twinkling stars
      starsRef.current.forEach(star => {
        star.twinkle += star.speed
        const alpha = 0.3 + Math.sin(star.twinkle) * 0.5
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2)
        ctx.fill()
      })

      // Floating orbs
      orbsRef.current.forEach(orb => {
        orb.x += orb.vx
        orb.y += orb.vy
        if (orb.x < -orb.r || orb.x > w + orb.r) orb.vx *= -1
        if (orb.y < -orb.r || orb.y > h + orb.r) orb.vy *= -1

        const grad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r)
        grad.addColorStop(0, orb.color + '60')
        grad.addColorStop(1, 'transparent')
        ctx.globalAlpha = orb.opacity
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2)
        ctx.fill()
      })
      ctx.globalAlpha = 1

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

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const supabase = useMemo(() => createClient(), [])
  const { user } = useAuth()
  const { onlineUsers } = usePresence()

  const fetchGroups = async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('groups')
      .select('*')
      .contains('member_ids', [user.id])
      .order('created_at', { ascending: false })
    if (data) setGroups(data as Group[])
    setLoading(false)
  }

  // Unread counts: count messages where user is not in read_by array
  const fetchUnreadCounts = useCallback(async () => {
    if (!user) return
    const { data: myGroups } = await supabase
      .from('groups')
      .select('id')
      .contains('member_ids', [user.id])
    if (!myGroups?.length) return

    const groupIds = myGroups.map(g => g.id)
    const { data: unreadMessages, error } = await supabase
      .from('group_messages')
      .select('group_id')
      .in('group_id', groupIds)
      .not('read_by', 'cs', `{${user.id}}`) // user.id not present in read_by array
    if (error) {
      console.error(error)
      return
    }
    const counts: Record<string, number> = {}
    unreadMessages?.forEach((msg: { group_id: string }) => {
      counts[msg.group_id] = (counts[msg.group_id] || 0) + 1
    })
    setUnreadCounts(counts)
  }, [user, supabase])

  useEffect(() => {
    fetchGroups()
    fetchUnreadCounts()
  }, [user, supabase, fetchUnreadCounts])

  // Real‑time updates
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('groups-list-unread')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_messages' }, () => fetchUnreadCounts())
      .subscribe()
    return () => { channel.unsubscribe() }
  }, [user, supabase, fetchUnreadCounts])

  const createGroup = async () => {
    if (!newName.trim() || !user) return
    const { error } = await supabase
      .from('groups')
      .insert({
        name: newName.trim(),
        created_by: user.id,
        member_ids: [user.id],
        admin_ids: [user.id],
      })
    if (!error) {
      setNewName('')
      setShowCreate(false)
      fetchGroups()
    }
  }

  const isGroupActive = (group: Group) => {
    const onlineArray = Array.from(onlineUsers)
    return group.member_ids.some(id => onlineArray.includes(id) && id !== user?.id)
  }

  if (loading) {
    return (
      <div className="p-4 space-y-4 relative h-full w-full overflow-hidden bg-[#0a0818]">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 animate-pulse">
            <div className="w-14 h-14 rounded-full bg-white/10" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-32 bg-white/10 rounded" />
              <div className="h-4 w-20 bg-white/10 rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0a0818]">
      <style>{`
        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 10px; }
      `}</style>

      <GroupsBackground />

      <div className="relative z-10 flex flex-col h-full">
        {/* Header – Transparent */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="p-4 lg:p-6 bg-transparent flex items-center justify-between sticky top-0 z-20"
        >
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            >
              <Users className="w-8 h-8 text-purple-400 drop-shadow-[0_0_12px_rgba(168,85,247,0.5)]" />
            </motion.div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent leading-tight">
                Groups
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">Cosmic conversations</p>
            </div>
          </div>
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-sm bg-white/10 px-3 py-1 rounded-full text-gray-300 border border-white/10"
          >
            {groups.length} {groups.length === 1 ? 'group' : 'groups'}
          </motion.span>
        </motion.div>

        {/* Group List */}
        <div className="flex-1 overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] lg:px-6 space-y-3 scrollbar-thin">
          <LayoutGroup>
            <AnimatePresence mode="popLayout">
              {groups.map((group, index) => {
                const unread = unreadCounts[group.id] || 0
                return (
                  <motion.div
                    key={group.id}
                    layout
                    initial={{ opacity: 0, x: -30, scale: 0.92 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95, x: 20, transition: { duration: 0.2 } }}
                    transition={{ delay: index * 0.04, type: 'spring', stiffness: 200, damping: 20 }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Link href={`/groups/${group.id}`}>
                      <div className="flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/30 rounded-2xl transition-all cursor-pointer group relative overflow-hidden shadow-lg hover:shadow-[0_0_20px_rgba(168,85,247,0.1)]">
                        {/* Glow on hover */}
                        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-blue-500/10" />
                        
                        {/* Online dot */}
                        {isGroupActive(group) && (
                          <motion.span
                            animate={{ scale: [1, 1.3, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute top-3 right-3 w-3 h-3 bg-green-400 rounded-full border-2 border-[#0a0818] shadow-[0_0_10px_rgba(74,222,128,0.6)]"
                          />
                        )}

                        {/* Avatar */}
                        <motion.div
                          whileHover={{ rotate: 5, scale: 1.05 }}
                          className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xl shadow-lg ring-2 ring-white/10 overflow-hidden flex-shrink-0"
                        >
                          {group.avatar_url ? (
                            <img src={group.avatar_url} className="w-full h-full object-cover" alt="" />
                          ) : (
                            group.name[0]?.toUpperCase()
                          )}
                        </motion.div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-lg font-semibold text-white truncate">{group.name}</p>
                            {unread > 0 && (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="bg-purple-500 text-white text-xs font-bold rounded-full px-2.5 py-0.5 shadow-[0_0_8px_rgba(168,85,247,0.6)]"
                              >
                                {unread > 99 ? '99+' : unread}
                              </motion.span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Users className="h-4 w-4 text-gray-400" />
                            <p className="text-sm text-gray-400">{group.member_ids.length} members</p>
                          </div>
                        </div>

                        <motion.div
                          whileHover={{ x: 3 }}
                          className="text-gray-500 opacity-0 group-hover:opacity-100 transition"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </motion.div>
                      </div>
                    </Link>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </LayoutGroup>

          {groups.length === 0 && (
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
              <p className="text-lg text-gray-400 font-medium">No groups yet</p>
              <p className="text-sm text-gray-600 mt-1">Create one and start a cosmic conversation</p>
            </motion.div>
          )}
        </div>

        {/* FAB */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowCreate(true)}
          className="absolute bottom-6 right-6 p-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full shadow-2xl z-20 group"
        >
          <Plus className="h-6 w-6 text-white" />
          <span className="absolute inset-0 rounded-full bg-white/20 animate-ping group-hover:animate-none" />
        </motion.button>

        {/* Create Modal */}
        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setShowCreate(false)}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="bg-gray-900/90 backdrop-blur-xl rounded-3xl p-6 w-full max-w-md border border-white/10 shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-400" /> New Group
                </h2>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Group name..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 mb-4 outline-none focus:border-purple-500 transition"
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setShowCreate(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createGroup}
                    disabled={!newName.trim()}
                    className="px-6 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg transition disabled:opacity-50"
                  >
                    Create
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}