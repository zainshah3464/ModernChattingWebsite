'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Smile, Paperclip, Mic, StopCircle, X, Loader2 } from 'lucide-react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import { Theme } from 'emoji-picker-react'

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false })

type Attachment = {
  file: File
  preview: string
  type: 'image' | 'video' | 'audio' | 'other'
}

type MessagePayload = {
  content: string
  file?: {
    url: string
    type: string
    thumbnail_url?: string
  }
}

interface Props {
  onSend: (payload: MessagePayload) => Promise<void>
  onTypingStart: () => void
  onTypingStop: () => void
}

export default function ChatInput({ onSend, onTypingStart, onTypingStop }: Props) {
  const [message, setMessage] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = useMemo(() => createClient(), [])
  const { user } = useAuth()

  // Typing handler
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setMessage(val)
    val.trim().length > 0 ? onTypingStart() : onTypingStop()
  }

  // Emoji
  const handleEmojiSelect = (emoji: any) => {
    setMessage(prev => prev + emoji.emoji)
    setShowEmoji(false)
  }

  // File selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const newAttachments: Attachment[] = []
    files.forEach(file => {
      let type: Attachment['type'] = 'other'
      if (file.type.startsWith('image/')) type = 'image'
      else if (file.type.startsWith('video/')) type = 'video'
      else if (file.type.startsWith('audio/')) type = 'audio'

      const preview = (type === 'image' || type === 'video' || type === 'audio')
        ? URL.createObjectURL(file)
        : ''

      newAttachments.push({ file, preview, type })
    })
    setAttachments(prev => [...prev, ...newAttachments])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Remove attachment
  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  // Upload file to Supabase
  const uploadFile = async (file: File): Promise<{ url: string; type: string }> => {
    const ext = file.name.split('.').pop()
    const fileName = `${user!.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`
    const { error } = await supabase.storage
      .from('chat_uploads')
      .upload(fileName, file, { cacheControl: '3600', upsert: false })
    if (error) throw error

    const { data: urlData } = supabase.storage
      .from('chat_uploads')
      .getPublicUrl(fileName)

    let type = 'other'
    if (file.type.startsWith('image/')) type = 'image'
    else if (file.type.startsWith('video/')) type = 'video'
    else if (file.type.startsWith('audio/')) type = 'audio'
    else if (file.type.includes('pdf')) type = 'document'

    return { url: urlData.publicUrl, type }
  }

  // Send message (with visual feedback & error handling)
  const handleSend = async () => {
    if (isSending) return
    if (!message.trim() && attachments.length === 0) return

    setIsSending(true)
    setError(null)

    // Optional: vibrate on mobile for tactile feedback
    if (navigator.vibrate) navigator.vibrate(30)

    try {
      // Upload all files first
      const filePayloads = await Promise.all(attachments.map(att => uploadFile(att.file)))

      // Send text message (if any)
      if (message.trim()) {
        await onSend({ content: message.trim() })
      }

      // Send each file as separate message
      for (const fp of filePayloads) {
        await onSend({
          content: '',
          file: { url: fp.url, type: fp.type },
        })
      }

      // Reset after success
      setMessage('')
      setAttachments([])
      onTypingStop()
    } catch (err: any) {
      console.error('Send failed:', err)
      setError(err.message || 'Failed to send. Please try again.')
    } finally {
      setIsSending(false)
    }
  }

  // --------------- Voice Recording --------------
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const url = URL.createObjectURL(audioBlob)
        const file = new File([audioBlob], `voice-${Date.now()}.webm`, { type: 'audio/webm' })
        setAttachments(prev => [...prev, { file, preview: url, type: 'audio' }])
        stream.getTracks().forEach(track => track.stop())
        setIsRecording(false)
        setRecordingTime(0)
        if (timerRef.current) clearInterval(timerRef.current)
      }

      mediaRecorder.start()
      setIsRecording(true)
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } catch (err) {
      console.warn('Microphone access denied or error:', err)
      setIsRecording(false)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  // Determine if send button should be enabled
  const canSend = !isSending && (message.trim().length > 0 || attachments.length > 0)

  return (
    <div className="relative">
      {/* 📎 Attachment previews – absolute positioned so they don't push the input bar */}
      <AnimatePresence>
        {attachments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-full left-0 right-0 mb-2 px-2"
          >
            <div className="flex gap-2 overflow-x-auto py-2 px-1 bg-gray-900/80 backdrop-blur-sm rounded-xl border border-white/10">
              {attachments.map((att, idx) => (
                <div key={idx} className="relative w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden bg-gray-800 shrink-0">
                  {att.type === 'image' ? (
                    <img src={att.preview} alt="" className="w-full h-full object-cover" />
                  ) : att.type === 'video' ? (
                    <video src={att.preview} className="w-full h-full object-cover" />
                  ) : att.type === 'audio' ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-xs text-gray-400">🎤</span>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400 px-1 break-all text-center">
                      {att.file.name.split('.').pop()?.toUpperCase()}
                    </div>
                  )}
                  <button
                    onClick={() => removeAttachment(idx)}
                    className="absolute top-0 right-0 bg-black/80 rounded-bl-lg p-0.5"
                    aria-label="Remove attachment"
                  >
                    <X className="h-3 w-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🎤 Voice recording indicator */}
      {isRecording && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border-t border-red-500/30">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-sm text-red-400 font-mono">{formatTime(recordingTime)}</span>
          <span className="text-xs sm:text-sm text-gray-300">Recording...</span>
          <button onClick={stopRecording} className="ml-auto p-2 bg-red-500/20 rounded-full hover:bg-red-500/30 min-w-[44px] min-h-[44px] flex items-center justify-center">
            <StopCircle className="h-5 w-5 text-red-400" />
          </button>
        </div>
      )}

      {/* 😊 Emoji Picker */}
      <AnimatePresence>
        {showEmoji && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-full right-0 mb-14 z-50 max-w-[95vw] overflow-auto"
          >
            <EmojiPicker onEmojiClick={handleEmojiSelect} theme={Theme.DARK} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error toast */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-4 py-2 bg-red-500/90 text-white text-sm rounded-full whitespace-nowrap"
          >
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 text-white/70 hover:text-white"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 💬 Input row */}
      <div className="flex items-center gap-1 sm:gap-2 p-2 sm:p-4 border-t border-white/10 bg-gray-900/50 backdrop-blur-sm">
        {/* Emoji toggle */}
        <button
          type="button"
          onClick={() => setShowEmoji(!showEmoji)}
          className="p-2 hover:bg-white/10 rounded-lg transition min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-95"
          aria-label="Toggle emoji picker"
        >
          <Smile className="h-5 w-5 text-gray-400" />
        </button>

        {/* File attachment */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 hover:bg-white/10 rounded-lg transition min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-95"
          aria-label="Attach file"
        >
          <Paperclip className="h-5 w-5 text-gray-400" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
        />

        {/* Microphone / stop recording */}
        {!isRecording ? (
          <button
            type="button"
            onClick={startRecording}
            className="p-2 hover:bg-white/10 rounded-lg transition min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-95"
            aria-label="Start voice recording"
          >
            <Mic className="h-5 w-5 text-gray-400" />
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            className="p-2 bg-red-500/20 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-95"
            aria-label="Stop recording"
          >
            <StopCircle className="h-5 w-5 text-red-400" />
          </button>
        )}

        {/* Text input */}
        <input
          type="text"
          value={message}
          onChange={handleChange}
          placeholder={isSending ? 'Sending...' : 'Type a message...'}
          className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-xl px-3 py-2 sm:py-3 text-sm sm:text-base text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-60"
          disabled={isSending}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          className="p-2 sm:p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-90"
          aria-label="Send message"
        >
          {isSending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  )
}