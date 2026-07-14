import { useMemo, useEffect, useRef } from 'react'
import { useLoader, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'
import { useStore, seeded } from './store'
import { Fry } from './Fry'
import { easeOutCubic } from './easings'
import { asset } from './asset'

const SCALE = 20
const FRY_SCALE = 1.44 // chunkier fries
const FRY_LIFT = 0.9 // raise the pile so the fries tower over the carton opening
const CLICKABLE_COUNT = 7 // golden fry + 6 regular fortunes

// Carton billboard dimensions (world units), from the PNG aspect ratios.
// The planes sit close together (with the fry depth compressed to fit) so
// camera parallax can't open a visible gap between front and back.
const FRONT_W = 3.5
const FRONT_H = FRONT_W * (1142 / 1096)
const BACK_W = 3.42
const BACK_H = BACK_W * (538 / 836)
const BACK_TOP = 4.62 // where the striped dome peaks
const FRONT_Z = 0.55
const BACK_Z = -0.5
const FRY_Z_SQUEEZE = 0.55
const HERO_LIFT = 0.42 // extra rise for the four standout fries

export function FriesModel() {
  const obj = useLoader(OBJLoader, asset('models/french_fries.obj'))
  const [colorMap, normalMap] = useLoader(THREE.TextureLoader, [
    asset('models/french_fries_texture.jpg'),
    asset('models/french_fries_texture_NORM.jpg'),
  ])
  const setFries = useStore((s) => s.setFries)
  const setPhase = useStore((s) => s.setPhase)

  const model = useMemo(() => {
    if (obj.userData.processed) return obj.userData.processed

    colorMap.colorSpace = THREE.SRGBColorSpace
    colorMap.anisotropy = 8
    normalMap.anisotropy = 8

    const entries = []
    obj.traverse((child) => {
      if (!child.isMesh) return
      if (child.name.toLowerCase().startsWith('holder')) return // replaced by the 2D carton
      entries.push({ objName: child.name, geo: child.geometry })
    })
    entries.sort((a, b) => a.objName.localeCompare(b.objName))

    // Re-pivot every fry at its own center so it can fall, lift and sway independently.
    const fries = entries.map((entry, i) => {
      entry.geo.computeBoundingBox()
      const center = entry.geo.boundingBox.getCenter(new THREE.Vector3())
      entry.geo.translate(-center.x, -center.y, -center.z)
      entry.geo.scale(SCALE * FRY_SCALE, SCALE * FRY_SCALE, SCALE * FRY_SCALE)
      const home = center.multiplyScalar(SCALE)
      home.y += FRY_LIFT
      home.z *= FRY_Z_SQUEEZE
      return {
        name: `fry_${String(i).padStart(2, '0')}`,
        geometry: entry.geo,
        home,
      }
    })

    // The fry poking highest out of the carton becomes the golden one.
    let golden = 0
    fries.forEach((f, i) => {
      if (f.home.y > fries[golden].home.y) golden = i
    })
    fries[golden].name = 'golden_fry'

    // Pick 6 more prominent, spread-out fries as the clickable fortunes.
    const clickableSet = new Set([golden])
    const byHeight = fries
      .map((f, i) => ({ i, x: f.home.x, y: f.home.y }))
      .filter((f) => f.i !== golden)
      .sort((a, b) => b.y - a.y)
    for (const cand of byHeight) {
      if (clickableSet.size >= CLICKABLE_COUNT) break
      const tooClose = [...clickableSet].some(
        (ci) => Math.abs(fries[ci].home.x - cand.x) < 0.35,
      )
      if (!tooClose) clickableSet.add(cand.i)
    }
    for (const cand of byHeight) {
      if (clickableSet.size >= CLICKABLE_COUNT) break
      clickableSet.add(cand.i)
    }

    // Four hero fries (the golden one + three spread-out fortunes) rise well
    // above the pile — tall enough to overlap the title lettering.
    const heroes = [golden]
    for (const i of clickableSet) {
      if (heroes.length >= 4 || i === golden) continue
      if (heroes.every((h) => Math.abs(fries[h].home.x - fries[i].home.x) > 0.45)) {
        heroes.push(i)
      }
    }
    for (const i of clickableSet) {
      if (heroes.length >= 4) break
      if (!heroes.includes(i)) heroes.push(i)
    }
    heroes.forEach((i) => {
      fries[i].home.y += HERO_LIFT
    })

    const baseMat = new THREE.MeshStandardMaterial({
      map: colorMap,
      normalMap,
      color: new THREE.Color('#ffe3ac'),
      roughness: 0.68,
      metalness: 0.02,
      emissive: new THREE.Color('#ff9d2e'),
      emissiveIntensity: 0,
    })
    const materials = fries.map((f, i) => {
      const m = baseMat.clone()
      if (i === golden) {
        m.color.set('#ffc93e')
        m.roughness = 0.4
        m.metalness = 0.18
        m.emissive.set('#ffae00')
        m.emissiveIntensity = 0.12
      }
      return m
    })

    const processed = { fries, golden, clickableSet, materials }
    obj.userData.processed = processed
    return processed
  }, [obj, colorMap, normalMap])

  useEffect(() => {
    let fortune = 0
    setFries(
      model.fries.map((f, i) => ({
        name: f.name,
        isGolden: i === model.golden,
        clickable: model.clickableSet.has(i),
        projectIndex: model.clickableSet.has(i) && i !== model.golden ? fortune++ : -1,
      })),
    )
    const id = setTimeout(() => setPhase('intro'), 400)
    return () => clearTimeout(id)
  }, [model, setFries, setPhase])

  return (
    <group>
      <Carton />
      <Smoke />
      <Salt />
      {model.fries.map((f, i) => (
        <Fry
          key={f.name}
          name={f.name}
          index={i}
          geometry={f.geometry}
          material={model.materials[i]}
          home={f.home}
          isGolden={i === model.golden}
          clickable={model.clickableSet.has(i)}
        />
      ))}
    </group>
  )
}

// The carton is two flat cutout billboards (the provided front.png/back.png):
// the striped dome sits behind the fries, the red front covers their base.
function Carton() {
  const [frontTex, backTex] = useLoader(THREE.TextureLoader, [
    asset('img/front.png'),
    asset('img/back.png'),
  ])
  const group = useRef()
  const start = useRef(null)
  const phase = useStore((s) => s.phase)

  useMemo(() => {
    for (const t of [frontTex, backTex]) {
      t.colorSpace = THREE.SRGBColorSpace
      t.anisotropy = 8
    }
  }, [frontTex, backTex])

  useEffect(() => {
    if (import.meta.env.DEV) window.__carton = group.current
  }, [])

  // The carton rises into frame from below the screen.
  useFrame((state) => {
    const g = group.current
    if (!g) return
    if (phase === 'loading') {
      g.position.y = -6
      return
    }
    if (start.current === null) start.current = state.clock.elapsedTime
    const p = Math.min(Math.max((state.clock.elapsedTime - start.current) / 0.9, 0), 1)
    g.position.y = -6 + easeOutCubic(p) * 6
  })

  return (
    <group ref={group}>
      <mesh position={[0, BACK_TOP - BACK_H / 2, BACK_Z]} raycast={() => null}>
        <planeGeometry args={[BACK_W, BACK_H]} />
        <meshBasicMaterial map={backTex} transparent toneMapped={false} />
      </mesh>
      <mesh position={[0, FRONT_H / 2, FRONT_Z]} raycast={() => null}>
        <planeGeometry args={[FRONT_W, FRONT_H]} />
        <meshBasicMaterial map={frontTex} transparent toneMapped={false} />
      </mesh>
    </group>
  )
}

// Subtle steam wisps rising off the fries — a soft radial blob texture on a
// few sprites that loop upward while fading in and out.
function makeSmokeTexture(size = 128) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  const g = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,0.85)')
  g.addColorStop(0.55, 'rgba(255,255,255,0.28)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return new THREE.CanvasTexture(canvas)
}

function Smoke() {
  const group = useRef()
  const phase = useStore((s) => s.phase)
  const tex = useMemo(() => makeSmokeTexture(), [])
  const wisps = useMemo(
    () =>
      Array.from({ length: 5 }, (_, i) => ({
        x: -1.1 + i * 0.55 + (seeded(i, 31) - 0.5) * 0.3,
        z: (seeded(i, 32) - 0.5) * 0.3,
        phase: seeded(i, 33),
        speed: 0.16 + seeded(i, 34) * 0.08,
        drift: (seeded(i, 35) - 0.5) * 0.6,
      })),
    [],
  )

  useFrame((state) => {
    const g = group.current
    if (!g) return
    const t = state.clock.elapsedTime
    const active = phase === 'ready'
    g.children.forEach((s, i) => {
      const w = wisps[i]
      const p = (t * w.speed + w.phase) % 1
      s.position.set(
        w.x + Math.sin(t * 0.6 + i * 2.1) * 0.14 + w.drift * p,
        3.5 + p * 1.7,
        w.z,
      )
      const sc = 0.45 + p * 1.0
      s.scale.set(sc, sc, 1)
      s.material.opacity = active ? Math.sin(p * Math.PI) * 0.34 : 0
    })
  })

  return (
    <group ref={group}>
      {wisps.map((_, i) => (
        <sprite key={i} raycast={() => null}>
          <spriteMaterial map={tex} transparent depthWrite={false} opacity={0} />
        </sprite>
      ))}
    </group>
  )
}

// Easter egg: a pinch of salt rains from the top of the screen into the
// carton when the mouse is shaken side to side.
const SALT_COUNT = 440
const SALT_G = 6 // gentle fall so the grains actually read on screen

function Salt() {
  const saltShake = useStore((s) => s.saltShake)
  const points = useRef()
  const batch = useRef(null)

  const grains = useMemo(
    () =>
      Array.from({ length: SALT_COUNT }, (_, i) => ({
        x: (seeded(i, 70) - 0.5) * 1.9,
        z: (seeded(i, 71) - 0.5) * 0.6,
        y0: 5.6 + seeded(i, 72) * 2.0,
        delay: seeded(i, 73) * 0.6,
      })),
    [],
  )
  const positions = useMemo(() => {
    const arr = new Float32Array(SALT_COUNT * 3)
    arr.fill(-100)
    return arr
  }, [])

  useEffect(() => {
    if (saltShake > 0) batch.current = { start: null }
  }, [saltShake])

  useEffect(() => {
    if (import.meta.env.DEV) window.__salt = points
  }, [])

  useFrame((state) => {
    const pts = points.current
    if (!pts) return
    const t = state.clock.elapsedTime
    const b = batch.current
    if (!b) {
      pts.visible = false
      return
    }
    if (b.start === null) b.start = t
    const e = t - b.start
    pts.visible = true
    let alive = 0
    const attr = pts.geometry.attributes.position
    for (let i = 0; i < SALT_COUNT; i++) {
      const g = grains[i]
      const tt = e - g.delay
      let y = -100
      if (tt > 0) {
        y = g.y0 - 0.5 * SALT_G * tt * tt
        if (y < 2.35) y = -100 // landed inside the carton
        else alive++
      } else {
        alive++
      }
      attr.setXYZ(i, g.x + Math.sin(t * 3 + i) * 0.02, y, g.z)
    }
    attr.needsUpdate = true
    if (e > 0.5 && alive === 0) batch.current = null
  })

  return (
    <points ref={points} raycast={() => null} visible={false} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#ffffff"
        size={2}
        sizeAttenuation={false}
        transparent
        opacity={1}
        depthWrite={false}
      />
    </points>
  )
}

// Dev helper: export the carton billboards as a GLB → exports/carton.glb.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.__THREE = THREE
  window.__exportCarton = async () => {
    const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js')
    const src = window.__carton
    if (!src) throw new Error('carton not ready')
    const root = new THREE.Group()
    root.name = 'pull_a_fry_carton'
    src.children.forEach((child, i) => {
      if (!child.isMesh) return
      const m = new THREE.Mesh(
        child.geometry.clone(),
        new THREE.MeshBasicMaterial({ map: child.material.map, transparent: true }),
      )
      m.position.copy(child.position)
      m.name = i === 0 ? 'carton_back' : 'carton_front'
      root.add(m)
    })
    const glb = await new Promise((resolve, reject) =>
      new GLTFExporter().parse(root, resolve, reject, { binary: true }),
    )
    const res = await fetch('/__export', { method: 'POST', body: glb })
    return await res.json()
  }
}
