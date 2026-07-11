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
  AlertTriangle,
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
//  Cosmic Background (improved)
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
      // More stars
      starsRef.current = Array.from({ length: 250 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 2.5 + 0.3,
        twinkle: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.03 + 0.008,
      }))
      // Smooth colored orbs
      const colors = ['#a855f7', '#7c3aed', '#8b5cf6', '#c084fc', '#f472b6', '#38bdf8']
      orbsRef.current = Array.from({ length: 6 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: Math.random() * 90 + 30,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: Math.random() * 0.1 + 0.03,
      }))
      shootingStarsRef.current = []
    }
    initScene()

    const draw = (time: number) => {
      ctx.clearRect(0, 0, w, h)
      // Deep gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h)
      skyGrad.addColorStop(0, '#0a0818')
      skyGrad.addColorStop(0.5, '#1a1430')
      skyGrad.addColorStop(1, '#241b3c')
      ctx.fillStyle = skyGrad
      ctx.fillRect(0, 0, w, h)

      // Stars with twinkling
      starsRef.current.forEach(star => {
        star.twinkle += star.speed
        const alpha = 0.4 + Math.sin(star.twinkle) * 0.5
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2)
        ctx.fill()
      })

      // Nebula orbs (floating)
      orbsRef.current.forEach(orb => {
        orb.x += orb.vx
        orb.y += orb.vy
        // Bounce off walls
        if (orb.x - orb.r < 0) { orb.x = orb.r; orb.vx *= -1 }
        if (orb.x + orb.r > w) { orb.x = w - orb.r; orb.vx *= -1 }
        if (orb.y - orb.r < 0) { orb.y = orb.r; orb.vy *= -1 }
        if (orb.y + orb.r > h) { orb.y = h - orb.r; orb.vy *= -1 }

        const grad = ctx.createRadialGradient(orb.x, orb.y, orb.r * 0.1, orb.x, orb.y, orb.r)
        grad.addColorStop(0, orb.color + '40')
        grad.addColorStop(1, 'transparent')
        ctx.globalAlpha = orb.opacity * (0.8 + 0.2 * Math.sin(time * 0.001 + orb.x))
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2)
        ctx.fill()
      })
      ctx.globalAlpha = 1

      // Shooting stars (slightly more frequent)
      if (Math.random() < 0.008) {
        const startX = Math.random() * w
        const startY = Math.random() * h * 0.4
        const angle = Math.random() * 0.7 + 0.1
        const speed = Math.random() * 6 + 3
        shootingStarsRef.current.push({
          x: startX,
          y: startY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
        })
      }
      shootingStarsRef.current = shootingStarsRef.current.filter(s => {
        s.life -= 0.018
        if (s.life <= 0) return false
        ctx.strokeStyle = `rgba(255, 255, 255, ${s.life})`
        ctx.lineWidth = 1.6
        ctx.beginPath()
        ctx.moveTo(s.x, s.y)
        ctx.lineTo(s.x + s.vx * 12, s.y + s.vy * 12)
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
  const [deleteConfirm, setDeleteConfirm] = useState<GalleryItem | null>(null)

  // Thumbnail signed URLs (small, only images)
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<string, string | null>>({})
  // Full signed URLs (on demand)
  const [fullUrls, setFullUrls] = useState<Record<string, string | null>>({})
  const [loadingFullUrl, setLoadingFullUrl] = useState<Set<string>>(new Set())

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

  // Only fetch tiny thumbnails for images on mount
  useEffect(() => {
    if (!user || items.length === 0) return

    const newThumbUrls: Record<string, string | null> = {}
    let anyChange = false

    const fetchThumbs = async () => {
      for (const item of items) {
        if (item.file_type === 'image' && !(item.file_url in thumbnailUrls)) {
          // Request a 400px wide thumbnail via Supabase transformations
          const { data, error } = await supabase.storage
            .from('gallery')
            .createSignedUrl(item.file_url, 86400, {
              transform: { width: 400, height: 300, resize: 'cover', quality: 75 },
            })
          if (data) {
            newThumbUrls[item.file_url] = data.signedUrl
          } else {
            newThumbUrls[item.file_url] = null // will show error placeholder
          }
          anyChange = true
        }
      }
      if (anyChange) {
        setThumbnailUrls(prev => ({ ...prev, ...newThumbUrls }))
      }
    }

    fetchThumbs()
  }, [items, user, supabase, thumbnailUrls])

  const getThumbnailUrl = (item: GalleryItem): string | null => {
    if (item.file_type === 'image') {
      return thumbnailUrls[item.file_url] ?? null
    }
    return null // video/file no thumbnail
  }

  // Get full URL on demand (lightbox)
  const getFullUrl = useCallback(
    async (item: GalleryItem): Promise<string | null> => {
      if (fullUrls[item.file_url]) return fullUrls[item.file_url]

      setLoadingFullUrl(prev => new Set(prev).add(item.file_url))

      let url: string | null = null
      if (item.file_type === 'image') {
        const { data } = await supabase.storage
          .from('gallery')
          .createSignedUrl(item.file_url, 3600) // no transform, full quality
        url = data?.signedUrl ?? null
      } else if (item.file_type === 'video') {
        const { data } = await supabase.storage
          .from('gallery')
          .createSignedUrl(item.file_url, 3600)
        url = data?.signedUrl ?? null
      } else {
        // file
        const { data } = await supabase.storage
          .from('gallery')
          .createSignedUrl(item.file_url, 3600)
        url = data?.signedUrl ?? null
      }

      setFullUrls(prev => ({ ...prev, [item.file_url]: url }))
      setLoadingFullUrl(prev => {
        const next = new Set(prev)
        next.delete(item.file_url)
        return next
      })
      return url
    },
    [supabase, fullUrls],
  )

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
    // Clear thumbnail cache for new items (they'll be refetched)
    setThumbnailUrls({})
    setFullUrls({})
  }

  const handleDelete = async (item: GalleryItem) => {
    if (!user) return
    setDeleteConfirm(null)
    await supabase.storage.from('gallery').remove([item.file_url])
    await supabase.from('user_gallery').delete().eq('id', item.id)
    setItems(prev => prev.filter(i => i.id !== item.id))
    if (selectedItem?.id === item.id) setSelectedItem(null)

    // Clear cached URLs
    setThumbnailUrls(prev => {
      const updated = { ...prev }
      delete updated[item.file_url]
      return updated
    })
    setFullUrls(prev => {
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
                  const thumbUrl = getThumbnailUrl(item)
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
                        delay: index * 0.03,
                      }}
                      className="relative group bg-white/5 backdrop-blur-sm border border-white/10 hover:border-white/30 rounded-2xl overflow-hidden transition-all cursor-pointer shadow-lg hover:shadow-[0_0_25px_rgba(168,85,247,0.2)]"
                      onClick={() => setSelectedItem(item)}
                    >
                      {/* Thumbnail */}
                      {item.file_type === 'image' ? (
                        thumbUrl ? (
                          <img
                            src={thumbUrl}
                            alt=""
                            className="w-full h-40 object-cover rounded-t-2xl"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-40 flex items-center justify-center bg-gray-800 rounded-t-2xl">
                            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                          </div>
                        )
                      ) : item.file_type === 'video' ? (
                        <div className="w-full h-40 flex items-center justify-center bg-gray-800 rounded-t-2xl relative">
                          <Video className="h-12 w-12 text-gray-400" />
                          <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded-full text-xs text-white">
                            VIDEO
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-40 flex items-center justify-center bg-gray-800 rounded-t-2xl">
                          <File className="h-12 w-12 text-gray-400" />
                        </div>
                      )}

                      {/* Hover delete button */}
                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteConfirm(item)
                        }}
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                        className="absolute top-2 right-2 p-2 bg-black/70 hover:bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200"
                      >
                        <Trash2 className="h-4 w-4 text-white" />
                      </motion.button>

                      {/* File type label */}
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
              {/* Close button */}
              <motion.button
                onClick={() => setSelectedItem(null)}
                whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.2)' }}
                whileTap={{ scale: 0.9 }}
                className="absolute top-4 right-4 z-20 p-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20"
              >
                <X className="h-5 w-5 text-white" />
              </motion.button>

              {/* Content */}
              {(() => {
                const isImage = selectedItem.file_type === 'image'
                const isVideo = selectedItem.file_type === 'video'
                const fullUrl = fullUrls[selectedItem.file_url]
                const isLoading = loadingFullUrl.has(selectedItem.file_url)

                if (!fullUrl && !isLoading) {
                  // Fetch on demand
                  getFullUrl(selectedItem)
                }

                if (isLoading || (!fullUrl && isImage)) {
                  return (
                    <div className="flex items-center justify-center h-80 bg-gray-900/80 rounded-2xl">
                      <Loader2 className="h-12 w-12 animate-spin text-purple-400" />
                    </div>
                  )
                }

                if (isImage && fullUrl) {
                  return (
                    <img
                      src={fullUrl}
                      alt=""
                      className="w-full h-auto max-h-[85vh] object-contain rounded-2xl shadow-2xl"
                    />
                  )
                }

                if (isVideo && fullUrl) {
                  return (
                    <video
                      src={fullUrl}
                      controls
                      className="w-full h-auto max-h-[85vh] rounded-2xl"
                    />
                  )
                }

                // File type
                return (
                  <div className="flex flex-col items-center justify-center bg-gray-900/80 backdrop-blur-md rounded-2xl p-10 border border-white/10">
                    <File className="h-24 w-24 text-gray-400 mb-4" />
                    <p className="text-lg text-white mb-4">
                      {selectedItem.file_url.split('/').pop()}
                    </p>
                    {fullUrl ? (
                      <a
                        href={fullUrl}
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
              })()}

              {/* Delete button in lightbox */}
              <motion.button
                onClick={() => setDeleteConfirm(selectedItem)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="mt-4 flex items-center gap-2 mx-auto px-5 py-2.5 bg-red-600/80 hover:bg-red-600 rounded-xl text-white text-sm font-medium backdrop-blur-sm"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-gray-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="h-6 w-6 text-amber-400" />
                <h3 className="text-lg font-semibold text-white">Delete permanently?</h3>
              </div>
              <p className="text-gray-400 text-sm mb-6">
                This item will be removed from your gallery and cannot be recovered.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
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