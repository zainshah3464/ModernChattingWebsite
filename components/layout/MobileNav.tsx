'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageCircle, Users, UserPlus, ImageIcon, UserCircle } from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'

const mobileLinks = [
  { href: '/world', icon: MessageCircle, label: 'World' },
  { href: '/private', icon: Users, label: 'Chats' },
  { href: '/groups', icon: UserPlus, label: 'Groups' },
  { href: '/gallery', icon: ImageIcon, label: 'Gallery' },
  { href: '/profile', icon: UserCircle, label: 'Me' },
]

export default function MobileNav() {
  const pathname = usePathname()
  const { user } = useAuth()
  const supabase = useMemo(() => createClient(), [])

  const [unreadPrivate, setUnreadPrivate] = useState(0)
  const [unreadGroup, setUnreadGroup] = useState(0)

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
      .channel('mobile-unread-private')
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
      // 1. Get group IDs where user is a member (from groups.member_ids)
      const { data: myGroups } = await supabase
        .from('groups')
        .select('id')
        .contains('member_ids', [user.id])

      if (!myGroups?.length) {
        setUnreadGroup(0)
        return
      }

      const groupIds = myGroups.map(g => g.id)

      // 2. Count messages where user is NOT in read_by array
      const { count, error } = await supabase
        .from('group_messages')
        .select('*', { count: 'exact', head: true })
        .in('group_id', groupIds)
        .not('read_by', 'cs', `{${user.id}}`) // array does NOT contain user.id

      if (!error) setUnreadGroup(count || 0)
    }

    fetchUnreadGroup()

    const channel = supabase
      .channel('mobile-unread-group')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'group_messages' },
        () => fetchUnreadGroup()
      )
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [user, supabase])

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-gray-900/80 backdrop-blur-xl border-t border-white/10 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
      <ul className="flex justify-around items-center pt-2 px-2">
        {mobileLinks.map(({ href, icon: Icon, label }) => {
          const isActive = pathname.startsWith(href)
          const isPrivate = href === '/private'
          const isGroup = href === '/groups'
          const unread = isPrivate ? unreadPrivate : isGroup ? unreadGroup : 0

          return (
            <motion.li key={href} whileTap={{ scale: 0.9 }} className="list-none flex-1">
              <Link
                href={href}
                className={`relative flex flex-col items-center gap-1 py-1 rounded-lg transition-all duration-200 ${
                  isActive ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <motion.div
                  className="relative"
                  whileHover={{ scale: 1.15 }}
                  transition={{ type: 'spring', stiffness: 400 }}
                >
                  <Icon className="h-6 w-6" />
                  {unread > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1.5 -right-1.5 bg-blue-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none shadow-[0_0_6px_rgba(59,130,246,0.7)]"
                    >
                      {unread > 99 ? '99+' : unread}
                    </motion.span>
                  )}
                </motion.div>
                <span className="text-[10px] font-medium">{label}</span>

                {isActive && (
                  <motion.div
                    layoutId="mobileActiveDot"
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-blue-400 rounded-full shadow-[0_0_6px_rgba(59,130,246,0.8)]"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </Link>
            </motion.li>
          )
        })}
      </ul>
    </nav>
  )
}