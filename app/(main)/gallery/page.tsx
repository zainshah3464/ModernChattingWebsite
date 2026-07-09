'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import {
  Upload,
  Image,
  Video,
  File,
  Loader2,
  Trash2,
  X,
  Sparkles,
} from 'lucide-react'

type GalleryItem = {
  id: number
  user_id: string
  file_url: string
  file_type: 'image' | 'video' | 'file'
  thumbnail_url: string | null
  uploaded_at: string
}

// ─────────────────────────────────────────
//  Cosmic Background
// ─────────────────────────────────────────
const GalleryBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)
  const starsRef = useRef<Array<{ x: number; y: number; r: number; twinkle: number; speed: number }>>([])
  const orbsRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; r: number; color: string; opacity: number }>>([])
  const shootingStarsRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; life: number }>>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let w = canvas.width = canvas.offsetWidth
    let h = canvas.height = canvas.offsetHeight

    const initScene = () => {
      starsRef.current = Array.from({ length: 180 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 2 + 0.5,
        twinkle: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.025 + 0.005,
      }))
      const colors = ['#a78bfa', '#818cf8', '#c084fc', '#f472b6', '#60a5fa']
      orbsRef.current = Array.from({ length: 5 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 80 + 40,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: Math.random() * 0.12 + 0.04,
      }))
      shootingStarsRef.current = []
    }
    initScene()

    const draw = (time: number) => {
      ctx.clearRect(0, 0, w, h)
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h)
      skyGrad.addColorStop(0, '#0a0818')
      skyGrad.addColorStop(1, '#1e1636')
      ctx.fillStyle = skyGrad
      ctx.fillRect(0, 0, w, h)

      starsRef.current.forEach(star => {
        star.twinkle += star.speed
        const alpha = 0.35 + Math.sin(star.twinkle) * 0.5
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2)
        ctx.fill()
      })

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

      if (Math.random() < 0.006) {
        const startX = Math.random() * w
        const startY = Math.random() * h * 0.5
        const angle = Math.random() * 0.6 + 0.15
        const speed = Math.random() * 5 + 3
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
        ctx.lineWidth = 1.5
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

export default function GalleryPage() {
  const { user } = useAuth()
  const supabase = useMemo(() => createClient(), [])
  const [items, setItems] = useState<GalleryItem[]>([])
  const [uploading, setUploading] = useState(false)
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [signedUrls, setSignedUrls] = useState<Record<string, string | null>>({})
  const processedRef = useRef<Set<string>>(new Set())

  const fetchItems = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('user_gallery')
      .select('*')
      .eq('user_id', user.id)
      .order('uploaded_at', { ascending: false })
    if (data) setItems(data)
  }, [user, supabase])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  // Generate signed URLs – async inside useEffect
  useEffect(() => {
    if (!user || items.length === 0) return

    const fetchSignedUrls = async () => {
      const newUrls: Record<string, string | null> = {}
      let changed = false

      for (const item of items) {
        if (processedRef.current.has(item.file_url)) continue

        const { data, error } = await supabase.storage
          .from('gallery')
          .createSignedUrl(item.file_url, 60 * 60) // 1 hour
        if (data) {
          newUrls[item.file_url] = data.signedUrl
        } else {
          newUrls[item.file_url] = null
        }
        processedRef.current.add(item.file_url)
        changed = true
      }

      if (changed) {
        setSignedUrls(prev => ({ ...prev, ...newUrls }))
      }
    }

    fetchSignedUrls()
  }, [items, user, supabase])

  const getSignedUrl = (path: string): string | null => signedUrls[path] || null

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !user) return
    setUploading(true)
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const fileExt = file.name.split('.').pop()
      const fileName = `${crypto.randomUUID()}.${fileExt}`
      const filePath = `${user.id}/${fileName}`
      let fileType: GalleryItem['file_type'] = 'file'
      if (file.type.startsWith('image/')) fileType = 'image'
      else if (file.type.startsWith('video/')) fileType = 'video'

      const { error: uploadError } = await supabase.storage
        .from('gallery')
        .upload(filePath, file, { upsert: false })
      if (uploadError) {
        console.error(uploadError)
        continue
      }

      const { data: insertData, error: dbError } = await supabase
        .from('user_gallery')
        .insert({ user_id: user.id, file_url: filePath, file_type: fileType, thumbnail_url: null })
        .select()
        .single()
      if (dbError) {
        await supabase.storage.from('gallery').remove([filePath])
      }
    }
    setUploading(false)
    e.target.value = ''
    fetchItems()
  }

  const handleDelete = async (item: GalleryItem) => {
    if (!user) return
    setDeleteId(item.id)
    await supabase.storage.from('gallery').remove([item.file_url])
    await supabase.from('user_gallery').delete().eq('id', item.id)
    setDeleteId(null)
    setItems(prev => prev.filter(i => i.id !== item.id))
    setSelectedItem(null)
    processedRef.current.delete(item.file_url)
    setSignedUrls(prev => {
      const updated = { ...prev }
      delete updated[item.file_url]
      return updated
    })
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0a0818]">
      <GalleryBackground />
      <div className="relative z-10 flex flex-col h-full p-4 lg:p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 6, repeat: Infinity }}
            >
              <Sparkles className="w-8 h-8 text-purple-400 drop-shadow-[0_0_12px_rgba(168,85,247,0.5)]" />
            </motion.div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
              My Gallery
            </h1>
          </div>
          <label className="relative cursor-pointer">
            <input
              type="file"
              multiple
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
              disabled={uploading}
            />
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl text-white font-medium transition-all shadow-lg shadow-purple-500/25"
            >
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Upload className="h-5 w-5" />
              )}
              {uploading ? 'Uploading...' : 'Upload'}
            </motion.div>
          </label>
        </motion.div>

        {/* Content */}
        {items.length === 0 && !uploading ? (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center justify-center py-32 text-center"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <Image className="h-20 w-20 text-gray-600 mb-4 opacity-50" />
            </motion.div>
            <p className="text-xl text-gray-400 font-medium">Your gallery is empty</p>
            <p className="text-sm text-gray-600 mt-2">Upload photos, videos or files to see them here</p>
          </motion.div>
        ) : (
          <LayoutGroup>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <AnimatePresence mode="popLayout">
                {items.map((item, index) => {
                  const signedUrl = getSignedUrl(item.file_url)
                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: -20 }}
                      transition={{
                        type: 'spring',
                        stiffness: 260,
                        damping: 20,
                        delay: index * 0.05,
                      }}
                      className="relative group bg-white/5 backdrop-blur-sm border border-white/10 hover:border-white/20 rounded-2xl overflow-hidden transition-all cursor-pointer shadow-lg hover:shadow-[0_0_20px_rgba(168,85,247,0.15)]"
                      onClick={() => setSelectedItem(item)}
                    >
                      {item.file_type === 'image' ? (
                        signedUrl ? (
                          <img src={signedUrl} alt="" className="w-full h-40 object-cover" />
                        ) : (
                          <div className="w-full h-40 flex items-center justify-center bg-gray-800">
                            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                          </div>
                        )
                      ) : item.file_type === 'video' ? (
                        signedUrl ? (
                          <video src={signedUrl} className="w-full h-40 object-cover" muted />
                        ) : (
                          <div className="w-full h-40 flex items-center justify-center bg-gray-800">
                            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                          </div>
                        )
                      ) : (
                        <div className="w-full h-40 flex items-center justify-center bg-gray-800">
                          <File className="h-12 w-12 text-gray-400" />
                        </div>
                      )}

                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(item)
                        }}
                        disabled={deleteId === item.id}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="absolute top-2 right-2 p-2 bg-black/70 hover:bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200"
                      >
                        {deleteId === item.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-white" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-white" />
                        )}
                      </motion.button>

                      <div className="absolute bottom-2 left-2 px-2 py-0.5 text-[10px] bg-black/60 backdrop-blur-sm rounded-full text-white uppercase font-medium">
                        {item.file_type}
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </LayoutGroup>
        )}
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
            onClick={() => setSelectedItem(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="relative max-w-5xl max-h-[90vh] w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.button
                onClick={() => setSelectedItem(null)}
                whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.2)' }}
                whileTap={{ scale: 0.9 }}
                className="absolute top-4 right-4 z-20 p-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20"
              >
                <X className="h-5 w-5 text-white" />
              </motion.button>

              {(() => {
                const url = getSignedUrl(selectedItem.file_url)
                if (selectedItem.file_type === 'image') {
                  return url ? (
                    <img src={url} alt="" className="w-full h-auto max-h-[85vh] object-contain rounded-2xl shadow-2xl" />
                  ) : (
                    <div className="flex items-center justify-center h-80 bg-gray-900 rounded-2xl">
                      <Loader2 className="h-10 w-10 animate-spin text-purple-400" />
                    </div>
                  )
                } else if (selectedItem.file_type === 'video') {
                  return url ? (
                    <video src={url} controls className="w-full h-auto max-h-[85vh] rounded-2xl" />
                  ) : (
                    <div className="flex items-center justify-center h-80 bg-gray-900 rounded-2xl">
                      <Loader2 className="h-10 w-10 animate-spin text-purple-400" />
                    </div>
                  )
                } else {
                  return (
                    <div className="flex flex-col items-center justify-center bg-gray-900/80 backdrop-blur-md rounded-2xl p-10 border border-white/10">
                      <File className="h-24 w-24 text-gray-400 mb-4" />
                      <p className="text-lg text-white mb-4">
                        {selectedItem.file_url.split('/').pop()}
                      </p>
                      {url ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl text-white font-medium transition"
                          download
                        >
                          Download File
                        </a>
                      ) : (
                        <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
                      )}
                    </div>
                  )
                }
              })()}

              <motion.button
                onClick={() => handleDelete(selectedItem)}
                disabled={deleteId === selectedItem.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="mt-4 flex items-center gap-2 mx-auto px-5 py-2.5 bg-red-600/80 hover:bg-red-600 rounded-xl text-white text-sm font-medium backdrop-blur-sm"
              >
                {deleteId === selectedItem.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Delete
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}