import { useRef, useState, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { easing } from 'maath'
import { useStore, meshRegistry, seeded } from './store'
import { easeOutCubic } from './easings'

const GRAVITY = 30 // world units/s² — scaled for a gentle, readable fall
const tmpVec = new THREE.Vector3()
const tmpEuler = new THREE.Euler()

// Diminishing-returns rubber band for the drag-out resistance.
const rubber = (px) => 1.15 * (1 - 1 / (1 + px / 140))

export function Fry({ name, geometry, material, home, index, isGolden, clickable }) {
  const mesh = useRef()
  const [hovered, setHovered] = useState(false)
  const width = useThree((s) => s.size.width)
  const isMobile = width < 640

  const phase = useStore((s) => s.phase)
  const selected = useStore((s) => s.selectedId === name)
  const anySelected = useStore((s) => !!s.selectedId)
  const isViewed = useStore((s) => s.viewed.includes(name))
  const refillKey = useStore((s) => s.refillKey)
  const select = useStore((s) => s.select)

  const reduced = useMemo(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  )

  // Per-fry animation scratchpad; reset when the carton refills.
  const freshAnim = () => ({ introStart: null, landed: false, selectT: 0, selectFrom: new THREE.Vector3(), eat: null, gone: false, pullPx: 0, pulling: false })
  const anim = useRef(null)
  if (!anim.current) anim.current = freshAnim()
  useEffect(() => {
    anim.current = freshAnim()
    material.clippingPlanes = null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refillKey])

  // Fry height in world units (geometry is already scaled), for the bite cuts.
  const fryHeight = useMemo(() => {
    geometry.computeBoundingBox()
    return geometry.boundingBox.max.y - geometry.boundingBox.min.y
  }, [geometry])

  useEffect(() => {
    meshRegistry[name] = mesh.current
    return () => delete meshRegistry[name]
  }, [name])

  const fall = useMemo(() => {
    const height = 7 + seeded(index, 2) * 3.5
    return {
      delay: reduced ? 0.9 + index * 0.012 : 1.05 + index * 0.045 + seeded(index, 1) * 0.25,
      height,
      duration: Math.sqrt((2 * height) / GRAVITY),
      // slight tilt drift while airborne — no spin, just a natural lean
      drift: new THREE.Euler(
        (seeded(index, 3) - 0.5) * 0.22,
        (seeded(index, 4) - 0.5) * 0.3,
        (seeded(index, 5) - 0.5) * 0.22,
      ),
      swayPhase: seeded(index, 6) * Math.PI * 2,
      swaySpeed: 0.7 + seeded(index, 7) * 0.5,
      tossDir: seeded(index, 8) > 0.5 ? 1 : -1,
    }
  }, [index, reduced])

  // Presentation spot: pulled out of the carton, above the modal.
  const focus = useMemo(() => {
    if (isGolden) return new THREE.Vector3(0, isMobile ? 6.2 : 5.3, isMobile ? 1.0 : 2.2)
    return new THREE.Vector3(0, isMobile ? 6.0 : 5.1, isMobile ? 0.9 : 2.0)
  }, [isGolden, isMobile])

  useFrame((state, dt) => {
    const m = mesh.current
    if (!m) return
    const t = state.clock.elapsedTime
    const a = anim.current

    if (phase === 'loading') {
      m.visible = false
      return
    }
    if (a.introStart === null) a.introStart = t
    const local = t - a.introStart

    // 1 — gravity fall from the top of the screen, with a small 5% rebound
    if (!a.landed) {
      const tl = local - fall.delay
      if (tl < 0) {
        m.visible = false
        m.position.set(home.x, home.y + fall.height, home.z)
        return
      }
      m.visible = true
      const T1 = fall.duration // touchdown time
      const vReb = Math.sqrt(2 * GRAVITY * fall.height * 0.05) // 5% rebound apex
      const T2 = (2 * vReb) / GRAVITY // rebound up + down
      let y
      if (tl < T1) {
        y = home.y + fall.height - 0.5 * GRAVITY * tl * tl
      } else if (tl < T1 + T2) {
        const tr = tl - T1
        y = home.y + vReb * tr - 0.5 * GRAVITY * tr * tr
      } else {
        a.landed = true
        m.position.copy(home)
      }
      if (!a.landed) {
        m.position.set(home.x, Math.max(y, home.y), home.z)
        const k = Math.min(tl / T1, 1)
        m.rotation.set(fall.drift.x * k, fall.drift.y * k, fall.drift.z * k)
        return
      }
    }

    // 2 — fry eaten in three bites, top-down (a clipping plane is the mouth)
    if (a.gone) {
      m.visible = false
      return
    }
    if (isViewed) {
      if (!a.eat) {
        a.eat = {
          t,
          x: m.position.x,
          z: Math.max(m.position.z, 1.6),
          planes: [
            new THREE.Plane(new THREE.Vector3(0, -1, 0), 1000),
            new THREE.Plane(new THREE.Vector3(0, -1, 0), 1000),
            new THREE.Plane(new THREE.Vector3(0, -1, 0), 1000),
          ],
        }
        material.clippingPlanes = a.eat.planes
        material.clipShadows = true
      }
      const e = t - a.eat.t
      const BITE = 0.45
      const bites = Math.min(Math.floor(e / BITE) + 1, 3)
      if (bites >= 3 && e > 3 * BITE) {
        a.gone = true
        material.clippingPlanes = null
        m.visible = false
        return
      }
      // drop into frame while being eaten — the mouth is mid-screen
      easing.damp3(m.position, [a.eat.x, 4.2, a.eat.z], 0.16, dt)
      // Jagged chomp: three steeply-tilted planes intersect in a rough,
      // toothy ridge that tracks the fry. Tilt, side and depth vary per bite.
      const side = bites % 2 ? 1 : -1
      const wob = seeded(index, 40 + bites)
      const wob2 = seeded(index, 60 + bites)
      const cutY =
        m.position.y +
        fryHeight / 2 -
        (bites * fryHeight) / 3 +
        fryHeight / 20 +
        (wob - 0.5) * fryHeight * 0.1
      const [pA, pB, pC] = a.eat.planes
      pA.normal.set(0.75 + wob * 0.45, -1, 0.4 * side).normalize()
      pB.normal.set(-(0.65 + wob2 * 0.5), -1, -0.35 * side).normalize()
      pC.normal.set(0.25 * side, -1, (0.7 + wob2 * 0.4) * -side).normalize()
      const verts = [
        [m.position.x + side * (0.05 + wob * 0.1), cutY, m.position.z],
        [m.position.x - side * (0.04 + wob2 * 0.08), cutY - fryHeight * 0.04, m.position.z],
        [m.position.x, cutY - fryHeight * 0.02, m.position.z + side * 0.05],
      ]
      a.eat.planes.forEach((p, i) => {
        const [vx, vy, vz] = verts[i]
        p.constant = -(p.normal.x * vx + p.normal.y * vy + p.normal.z * vz)
      })
      // a little chomp jolt on every bite
      const bp = (e % BITE) / BITE
      const jolt = Math.exp(-bp * 7)
      m.rotation.z += side * jolt * 0.012
      m.position.y += jolt * 0.01
      return
    }
    if (a.eat) {
      a.eat = null
      material.clippingPlanes = null
    }

    m.visible = true

    // 3 — selected: strain against the carton, then pop up to the spotlight
    if (selected) {
      if (!a.selectT) {
        a.selectT = t
        a.selectFrom.copy(m.position)
      }
      const sp = t - a.selectT
      if (sp < 0.3) {
        // heavy resistance — the fry fights back a little
        const p = sp / 0.3
        m.position.lerpVectors(
          a.selectFrom,
          tmpVec.set(a.selectFrom.x, a.selectFrom.y + 0.55, a.selectFrom.z),
          p * p,
        )
      } else {
        tmpVec.copy(focus)
        tmpVec.y += Math.sin(t * 2.1) * 0.08
        easing.damp3(m.position, tmpVec, isGolden ? 0.16 : 0.2, dt)
      }
      const tilt = isMobile ? -0.15 : -0.32
      // full spin on the way up, then a slow continuous turn while presented
      const riseSpin =
        easeOutCubic(Math.min(Math.max(sp - 0.2, 0) / 0.9, 1)) * Math.PI * 2 +
        Math.max(sp - 1.2, 0) * 0.45
      if (isGolden) {
        const spinP = Math.min(Math.max(sp - 0.25, 0) / 1.3, 1)
        tmpEuler.set(
          tilt + Math.sin(t * 1.7) * 0.05,
          easeOutCubic(spinP) * Math.PI * 4 + Math.max(sp - 1.65, 0) * 0.45,
          0.08,
        )
        easing.dampE(m.rotation, tmpEuler, 0.12, dt)
        easing.damp(material, 'emissiveIntensity', 0.4 + Math.sin(t * 3) * 0.12, 0.15, dt)
      } else {
        tmpEuler.set(tilt + Math.sin(t * 1.7) * 0.05, riseSpin + 0.15, 0.1)
        easing.dampE(m.rotation, tmpEuler, 0.18, dt)
        easing.damp(material, 'emissiveIntensity', 0.22, 0.2, dt)
      }
      return
    }
    a.selectT = 0

    // 4 — mid-drag: rubber-band lift under the pointer
    if (a.pulling) {
      tmpVec.set(home.x, home.y + rubber(a.pullPx), home.z)
      easing.damp3(m.position, tmpVec, 0.08, dt)
      tmpEuler.set(-rubber(a.pullPx) * 0.12, 0, 0)
      easing.dampE(m.rotation, tmpEuler, 0.12, dt)
      easing.damp(material, 'emissiveIntensity', 0.25, 0.2, dt)
      return
    }

    // 5 — idle: settle home with a gentle sway. A fry returning from the
    // spotlight first slides back over the opening while staying high, then
    // drops straight down — otherwise it would cut through the carton front.
    const hoverActive = hovered && clickable && !anySelected && phase === 'ready'
    if (m.position.y > home.y + 0.7) {
      const overSlot =
        Math.abs(m.position.z - home.z) < 0.2 && Math.abs(m.position.x - home.x) < 0.3
      tmpVec.set(
        home.x,
        overSlot ? home.y : Math.max(m.position.y, home.y + 1.9),
        home.z,
      )
      easing.damp3(m.position, tmpVec, 0.16, dt)
    } else {
      tmpVec.copy(home)
      if (hoverActive) tmpVec.y += 0.14
      easing.damp3(m.position, tmpVec, 0.18, dt)
    }
    const swayT = t * fall.swaySpeed + fall.swayPhase
    tmpEuler.set(Math.sin(swayT * 0.8) * 0.012, 0, Math.sin(swayT) * 0.018)
    easing.dampE(m.rotation, tmpEuler, 0.25, dt)
    const idleGlow = isGolden ? 0.15 + Math.sin(t * 2.5) * 0.09 : 0
    easing.damp(material, 'emissiveIntensity', hoverActive ? 0.28 : idleGlow, 0.2, dt)
  })

  const interactive = clickable && phase === 'ready' && !anySelected && !isViewed

  const onPointerDown = (e) => {
    if (!interactive) return
    e.stopPropagation()
    const start = { y: e.clientY, t: Date.now() }
    const a = anim.current
    a.pulling = true
    a.pullPx = 0
    const finish = (doSelect) => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      a.pulling = false
      a.pullPx = 0
      if (doSelect) select(name, isGolden)
    }
    const onMove = (ev) => {
      a.pullPx = Math.max(0, start.y - ev.clientY)
      if (a.pullPx > 90) finish(true) // pulled free
    }
    const onUp = (ev) =>
      finish(Date.now() - start.t < 350 && Math.abs(ev.clientY - start.y) < 10) // quick tap
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <mesh
      ref={mesh}
      name={name}
      geometry={geometry}
      material={material}
      position={[home.x, home.y + 10, home.z]}
      castShadow
      receiveShadow
      onPointerDown={onPointerDown}
      onPointerOver={(e) => {
        if (!interactive) return
        e.stopPropagation()
        setHovered(true)
        document.body.style.cursor = `url('${import.meta.env.BASE_URL}img/grab.svg') 12 12, grab`
      }}
      onPointerOut={() => {
        setHovered(false)
        document.body.style.cursor = 'auto'
      }}
    >
      {isGolden && selected && (
        <pointLight color="#FFB300" intensity={7} distance={8} decay={2} />
      )}
    </mesh>
  )
}
