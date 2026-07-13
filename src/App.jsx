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
