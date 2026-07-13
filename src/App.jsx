import { Suspense, useEffect, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { Scene } from './Scene'
import { useStore } from './store'
import { Loader, Header, Hud, Cta, Lettering, FortuneModal, GoldenFlash, FallbackSite } from './ui'

function supportsWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

export default function App() {
  const webgl = useMemo(supportsWebGL, [])
  const phase = useStore((s) => s.phase)
  const friesCount = useStore((s) => s.fries.length)

  // Intro ends once the last fry has landed (carton rise + stagger + fall).
  useEffect(() => {
    if (phase !== 'intro') return
    const ms = (1.05 + friesCount * 0.045 + 0.95 + 0.5) * 1000
    const id = setTimeout(() => useStore.getState().setPhase('ready'), ms)
    return () => clearTimeout(id)
  }, [phase, friesCount])

  // Easter egg: shake the mouse rapidly side to side → a pinch of salt falls.
  // Tracks movement runs (extreme-to-extreme), since individual pointermove
  // deltas are tiny at high event rates.
  useEffect(() => {
    const SWING = 50 // px a run must reverse by to count as a flip
    let anchorX = null
    let dir = 0
    let flips = []
    let cooldownUntil = 0
    const onMove = (e) => {
      const now = performance.now()
      const x = e.clientX
      if (anchorX === null) anchorX = x
      if (dir >= 0 && x < anchorX - SWING) {
        if (dir === 1) flips.push(now)
        dir = -1
        anchorX = x
      } else if (dir <= 0 && x > anchorX + SWING) {
        if (dir === -1) flips.push(now)
        dir = 1
        anchorX = x
      } else if (dir === 1 && x > anchorX) {
        anchorX = x // extend the rightward run
      } else if (dir === -1 && x < anchorX) {
        anchorX = x // extend the leftward run
      }
      flips = flips.filter((t) => now - t < 1200)
      if (flips.length >= 4 && now > cooldownUntil) {
        cooldownUntil = now + 4000
        flips = []
        useStore.getState().shakeSalt()
      }
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  if (!webgl) return <FallbackSite />

  const isTouch = window.matchMedia('(pointer: coarse)').matches

  return (
    <div className="app">
      <Lettering />
      <Canvas
        shadows
        dpr={[1, isTouch ? 1.5 : 2]}
        camera={{ fov: 40, position: [0, 3.6, 8.4], near: 0.1, far: 100 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.localClippingEnabled = true // the eat-the-fry bites use clipping planes
        }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
      <div className="vignette" aria-hidden="true" />
      <Header />
      <Hud />
      <Cta />
      <FortuneModal />
      <GoldenFlash />
      <Loader />
    </div>
  )
}
