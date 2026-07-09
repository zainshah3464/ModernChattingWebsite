'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw } from 'lucide-react'

const ErrorBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let w = canvas.width = canvas.offsetWidth
    let h = canvas.height = canvas.offsetHeight

    const particles: Array<{
      x: number; y: number; vx: number; vy: number; size: number; opacity: number
    }> = Array.from({ length: 60 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 1.5,
      vy: (Math.random() - 0.5) * 1.5,
      size: Math.random() * 4 + 1,
      opacity: Math.random() * 0.5 + 0.2,
    }))

    const animate = () => {
      ctx.clearRect(0, 0, w, h)
      const grad = ctx.createLinearGradient(0, 0, 0, h)
      grad.addColorStop(0, '#0f0a1e')
      grad.addColorStop(1, '#1e1630')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, w, h)

      particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        if (p.x < -10 || p.x > w + 10) p.vx *= -1
        if (p.y < -10 || p.y > h + 10) p.vy *= -1
        ctx.fillStyle = `rgba(255, 100, 100, ${p.opacity})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      })

      animFrameRef.current = requestAnimationFrame(animate)
    }

    animFrameRef.current = requestAnimationFrame(animate)

    const handleResize = () => {
      w = canvas.width = canvas.offsetWidth
      h = canvas.height = canvas.offsetHeight
    }
    window.addEventListener('resize', handleResize)
    return () => {
      cancelAnimationFrame(animFrameRef.current)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
}

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: ErrorProps) {
  // Log the error to an error reporting service
  useEffect(() => {
    console.error('Unhandled error:', error)
  }, [error])

  return (
    <html>
      <body>
        <div className="relative h-screen w-full flex items-center justify-center overflow-hidden bg-[#0f0a1e]">
          <ErrorBackground />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="relative z-10 text-center px-6"
          >
            <motion.div
              initial={{ y: -20 }}
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-8xl font-black bg-gradient-to-r from-red-400 to-orange-500 bg-clip-text text-transparent select-none"
            >
              Oops!
            </motion.div>
            
            <h1 className="text-2xl font-bold text-white mt-4">Something went wrong</h1>
            <p className="text-gray-400 max-w-md mx-auto mt-2">
              A cosmic glitch disrupted the fabric of this page. Don't worry, it's probably temporary.
            </p>
            
            <motion.button
              onClick={() => reset()}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="mt-8 flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold rounded-full shadow-xl hover:shadow-red-500/30 transition-all mx-auto"
            >
              <RefreshCw className="w-5 h-5" />
              Try Again
            </motion.button>
          </motion.div>
        </div>
      </body>
    </html>
  )
}