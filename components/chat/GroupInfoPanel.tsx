'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import { usePresence } from '@/components/providers/PresenceProvider'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Trash2, Crown, User, Loader2, ImagePlus, Search, Users } from 'lucide-react'

type Member = {
  user_id: string
  role: 'admin' | 'member'
  profiles: {
    id: string
    full_name: string | null
    username: string | null
    avatar_url: string | null
  } | null
}

type GroupInfo = {
  id: string
  name: string
  created_by: string
  avatar_url: string | null
  member_ids: string[]
  admin_ids: string[]
}

interface Props {
  groupId: string
  isOpen: boolean
  onClose: () => void
}

export default function GroupInfoPanel({ groupId, isOpen, onClose }: Props) {
  const { user } = useAuth()
  const supabase = createClient()
  const { onlineUsers } = usePresence()
  const onlineArray = Array.from(onlineUsers || [])

  const [group, setGroup] = useState<GroupInfo | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    const { data: grp } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single()

    if (grp) {
      setGroup(grp)
      if (grp.member_ids.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url')
          .in('id', grp.member_ids)

        const membersList: Member[] = grp.member_ids.map((uid: string) => {
          const profile = profiles?.find(p => p.id === uid) || null
          return {
            user_id: uid,
            role: grp.admin_ids.includes(uid) ? 'admin' : 'member',
            profiles: profile,
          }
        })
        setMembers(membersList)
      } else {
        setMembers([])
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    if (isOpen) fetchData()
  }, [isOpen, groupId])

  const currentMember = members.find(m => m.user_id === user?.id)
  const isAdmin = currentMember?.role === 'admin'
  const isCreator = group?.created_by === user?.id

  const handleLeave = async () => {
    if (!confirm('Leave this group?')) return
    await supabase.rpc('remove_group_member', {
      p_group_id: groupId,
      p_user_id: user?.id,
    })
    onClose()
  }

  const handleDelete = async () => {
    if (!confirm('Delete group permanently?')) return
    await supabase.from('groups').delete().eq('id', groupId)
    onClose()
  }

  const handleRemoveMember = async (userId: string) => {
    if (!isAdmin || userId === group?.created_by) return alert('Cannot remove creator')
    await supabase.rpc('remove_group_member', {
      p_group_id: groupId,
      p_user_id: userId,
    })
    fetchData()
  }

  const handlePromote = async (userId: string) => {
    await supabase.rpc('promote_group_admin', {
      p_group_id: groupId,
      p_user_id: userId,
    })
    fetchData()
  }

  const handleDemote = async (userId: string) => {
    await supabase.rpc('demote_group_admin', {
      p_group_id: groupId,
      p_user_id: userId,
    })
    fetchData()
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !group) return
    setUploadingAvatar(true)
    const filePath = `${groupId}/${Date.now()}-${file.name}`
    const { error: uploadError } = await supabase.storage.from('group-avatars').upload(filePath, file)
    if (uploadError) {
      console.error(uploadError)
      setUploadingAvatar(false)
      return
    }
    const { data: { publicUrl } } = supabase.storage.from('group-avatars').getPublicUrl(filePath)
    await supabase.from('groups').update({ avatar_url: publicUrl }).eq('id', groupId)
    setGroup(prev => (prev ? { ...prev, avatar_url: publicUrl } : null))
    setUploadingAvatar(false)
  }

  if (!isOpen) return null

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="group-info-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed right-0 top-0 h-full w-full sm:w-80 bg-gray-900/95 backdrop-blur-xl border-l border-white/10 shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Group Info</h2>
              <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="animate-spin h-8 w-8 text-blue-400" />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Avatar & Name */}
                <div className="flex flex-col items-center gap-3">
                  <div className="relative group">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 p-0.5">
                      <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center overflow-hidden">
                        {group?.avatar_url ? (
                          <img src={group.avatar_url} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <span className="text-2xl font-bold text-white">
                            {group?.name?.[0]?.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                    {isAdmin && (
                      <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition">
                        <ImagePlus className="h-6 w-6 text-white" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAvatarUpload}
                          disabled={uploadingAvatar}
                        />
                      </label>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-white">{group?.name}</h3>
                  <p className="text-sm text-gray-400">{members.length} members</p>
                </div>

                {/* Members List */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-gray-300">
                      Members ({members.length})
                    </p>
                    {isAdmin && (
                      <button
                        onClick={() => setShowAddModal(true)}
                        className="text-xs bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 px-3 py-1 rounded-full flex items-center gap-1 transition"
                      >
                        <Plus className="h-3 w-3" /> Add
                      </button>
                    )}
                  </div>
                  <div className="space-y-1">
                    {members.map((member, i) => {
                      const profile = member.profiles
                      const isMe = member.user_id === user?.id
                      const isMemberCreator = member.user_id === group?.created_by
                      const isOnline = onlineArray.includes(member.user_id)

                      return (
                        <motion.div
                          key={member.user_id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 group"
                        >
                          <div className="relative flex-shrink-0">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                              {profile?.avatar_url ? (
                                <img src={profile.avatar_url} className="w-full h-full object-cover" alt="" />
                              ) : (
                                profile?.full_name?.[0]?.toUpperCase() || '?'
                              )}
                            </div>
                            {isOnline && (
                              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-gray-900" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate">
                              {profile?.full_name || 'Unknown'}
                              {isMe && ' (You)'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {member.role === 'admin' ? 'Admin' : 'Member'}
                            </p>
                          </div>
                          {member.role === 'admin' && (
                            <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-full font-medium">
                              Admin
                            </span>
                          )}
                          {isAdmin && !isMe && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                              {!isMemberCreator && (
                                <button onClick={() => handleRemoveMember(member.user_id)} title="Remove">
                                  <Trash2 className="h-4 w-4 text-red-400 hover:text-red-300" />
                                </button>
                              )}
                              {member.role === 'member' ? (
                                <button onClick={() => handlePromote(member.user_id)} title="Promote">
                                  <Crown className="h-4 w-4 text-yellow-400 hover:text-yellow-300" />
                                </button>
                              ) : (
                                <button onClick={() => handleDemote(member.user_id)} title="Demote">
                                  <User className="h-4 w-4 text-gray-400 hover:text-gray-300" />
                                </button>
                              )}
                            </div>
                          )}
                          {isMemberCreator && (
                            // ✅ Fixed: remove title prop from Crown icon
                            <Crown className="h-4 w-4 text-yellow-500" />
                          )}
                        </motion.div>
                      )
                    })}
                  </div>
                </div>

                {/* Leave / Delete */}
                <div className="pt-4 border-t border-white/10 space-y-2">
                  {!isCreator ? (
                    <button
                      onClick={handleLeave}
                      className="w-full py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition"
                    >
                      Leave Group
                    </button>
                  ) : (
                    <button
                      onClick={handleDelete}
                      className="w-full py-2 rounded-lg bg-red-600/80 text-white hover:bg-red-600 transition"
                    >
                      Delete Group
                    </button>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Member Modal */}
      {showAddModal && (
        <AddMemberModal
          groupId={groupId}
          onClose={() => {
            setShowAddModal(false)
            fetchData()
          }}
        />
      )}
    </>
  )
}

// Add Member Modal (standalone)
function AddMemberModal({ groupId, onClose }: { groupId: string; onClose: () => void }) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [existingIds, setExistingIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('groups')
      .select('member_ids')
      .eq('id', groupId)
      .single()
      .then(({ data }) => {
        if (data?.member_ids) setExistingIds(data.member_ids)
      })
  }, [groupId])

  const handleSearch = async (query: string) => {
    setSearch(query)
    if (!query.trim()) {
      setResults([])
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url')
      .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
      .limit(15)
    setResults((data || []).filter(u => !existingIds.includes(u.id)))
    setLoading(false)
  }

  const addMember = async (userId: string) => {
    await supabase.rpc('add_group_member', {
      p_group_id: groupId,
      p_user_id: userId,
    })
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gray-900 rounded-3xl p-6 w-full max-w-md border border-white/10 shadow-2xl max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">Add Members</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or username..."
            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin h-6 w-6 text-blue-400" />
            </div>
          ) : results.length > 0 ? (
            results.map(user => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 transition cursor-pointer group"
                onClick={() => addMember(user.id)}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold overflow-hidden flex-shrink-0">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    user.full_name?.[0]?.toUpperCase() || '?'
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user.full_name || 'Unknown'}</p>
                  <p className="text-xs text-gray-400">@{user.username}</p>
                </div>
                <motion.span
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-3 py-1 rounded-full bg-blue-600/20 text-blue-400 text-xs font-medium opacity-0 group-hover:opacity-100 transition"
                >
                  Add
                </motion.span>
              </motion.div>
            ))
          ) : search ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <Users className="h-10 w-10 mb-2 text-gray-600" />
              <p>No users found</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <Search className="h-10 w-10 mb-2 text-gray-600" />
              <p>Search to add members</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}