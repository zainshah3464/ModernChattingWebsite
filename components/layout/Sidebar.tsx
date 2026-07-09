'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  MessageCircle,
  Users,
  UserPlus,
  ImageIcon,
  UserCircle,
  LogOut,
} from 'lucide-react'
import { motion } from 'framer-motion'

const links = [
  { href: '/world', label: 'World Chat', icon: MessageCircle },
  { href: '/private', label: 'Private Chats', icon: Users },
  { href: '/groups', label: 'Groups', icon: UserPlus },
  { href: '/gallery', label: 'Gallery', icon: ImageIcon },
  { href: '/profile', label: 'Profile', icon: UserCircle },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { profile, signOut, user } = useAuth()
  const supabase = useMemo(() => createClient(), [])

  const [unreadPrivate, setUnreadPrivate] = useState(0)
  const [unreadGroup, setUnreadGroup] = useState(0)
  const [avatarError, setAvatarError] = useState(false)

  useEffect(() => {
    setAvatarError(false)
  }, [profile?.avatar_url])

  // Private unread
  useEffect(() => {
    if (!user) return

    const fetchUnreadPrivate = async () => {
      const { count, error } = await supabase
        .from('private_messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('read', false)
      if (!error) setUnreadPrivate(count || 0)
    }

    fetchUnreadPrivate()

    const channel = supabase
      .channel('sidebar-unread-private')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'private_messages', filter: `receiver_id=eq.${user.id}` },
        () => fetchUnreadPrivate()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'private_messages', filter: `receiver_id=eq.${user.id}` },
        () => fetchUnreadPrivate()
      )
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [user, supabase])

  // Group unread (using member_ids & read_by array)
  useEffect(() => {
    if (!user) return

    const fetchUnreadGroup = async () => {
      const { data: myGroups } = await supabase
        .from('groups')
        .select('id')
        .contains('member_ids', [user.id])

      if (!myGroups?.length) {
        setUnreadGroup(0)
        return
      }

      const groupIds = myGroups.map(g => g.id)

      const { count, error } = await supabase
        .from('group_messages')
        .select('*', { count: 'exact', head: true })
        .in('group_id', groupIds)
        .not('read_by', 'cs', `{${user.id}}`)

      if (!error) setUnreadGroup(count || 0)
    }

    fetchUnreadGroup()

    const channel = supabase
      .channel('sidebar-unread-group')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'group_messages' },
        () => fetchUnreadGroup()
      )
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [user, supabase])

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen bg-gray-900/70 backdrop-blur-2xl border-r border-white/5 p-4 shadow-xl">
      {/* User Info */}
      <div className="flex items-center gap-3 mb-8 mt-2">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-[0_0_12px_rgba(59,130,246,0.5)] overflow-hidden">
            {profile?.avatar_url && !avatarError ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="w-full h-full object-cover rounded-full"
                onError={() => setAvatarError(true)}
              />
            ) : (
              <span>{profile?.full_name?.[0]?.toUpperCase() || '?'}</span>
            )}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-gray-900 animate-pulse shadow-[0_0_6px_rgba(74,222,128,0.6)]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate text-white">
            {profile?.full_name || 'User'}
          </p>
          <p className="text-xs text-gray-400 truncate">
            @{profile?.username || 'user'}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {links.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href)
          const isPrivate = href === '/private'
          const isGroup = href === '/groups'
          const unread = isPrivate ? unreadPrivate : isGroup ? unreadGroup : 0

          return (
            <Link key={href} href={href}>
              <motion.div
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.96 }}
                className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer overflow-hidden ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.2)]'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebarActiveBar"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-blue-400 to-purple-400 rounded-r-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className="font-medium flex-1">{label}</span>
                {unread > 0 && (
                  <motion.span
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="bg-blue-500 text-white text-xs font-bold rounded-full px-2.5 py-0.5 min-w-[20px] text-center shadow-[0_0_8px_rgba(59,130,246,0.6)]"
                  >
                    {unread > 99 ? '99+' : unread}
                  </motion.span>
                )}
              </motion.div>
            </Link>
          )
        })}
      </nav>

      {/* Sign Out */}
      <motion.button
        whileHover={{ scale: 1.02, backgroundColor: 'rgba(239,68,68,0.1)' }}
        whileTap={{ scale: 0.98 }}
        onClick={signOut}
        className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-red-400 transition-all mt-auto"
      >
        <LogOut className="h-5 w-5" />
        <span>Sign Out</span>
      </motion.button>
    </aside>
  )
}