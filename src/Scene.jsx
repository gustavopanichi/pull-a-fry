import { useFrame } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import * as THREE from 'three'
import { easing } from 'maath'
import { useStore, meshRegistry } from './store'
import { FriesModel } from './FriesModel'

const camTarget = new THREE.Vector3(0, 3.55, 0)

function CameraRig() {
  const selectedId = useStore((s) => s.selectedId)
  const fries = useStore((s) => s.fries)
  const isGolden = !!(selectedId && fries.find((f) => f.name === selectedId)?.isGolden)

  useFrame((state, dt) => {
    const { camera, pointer, size } = state
    const mobile = size.width / size.height < 0.85
    const fov = mobile ? 50 : 40
    if (camera.fov !== fov) {
      camera.fov = fov
      camera.updateProjectionMatrix()
    }

    let px, py, pz, tx, ty, tz
    const sel = selectedId && meshRegistry[selectedId]
    if (sel) {
      const fp = sel.position
      px = 0
      py = isGolden ? 4.0 : 3.8
      pz = mobile ? 11.2 : 8.8
      tx = fp.x * 0.4
      ty = 3.3 + (fp.y - 3.3) * 0.45
      tz = 0
    } else {
      // straight-on hero composition: flat carton billboards stay unskewed,
      // product sits low with the carton bleeding out of the bottom edge
      px = pointer.x * 0.22
      py = (mobile ? 3.75 : 3.6) + pointer.y * 0.12
      pz = mobile ? 8.8 : 7.6
      tx = pointer.x * 0.07
      ty = mobile ? 3.75 : 3.6
      tz = 0
    }
    easing.damp3(camera.position, [px, py, pz], 0.5, dt)
    easing.damp3(camTarget, [tx, ty, tz], 0.45, dt)
    camera.lookAt(camTarget)
  })
  return null
}

export function Scene() {
  return (
    <>
      <ambientLight intensity={0.55} />
      <hemisphereLight args={['#fff6dd', '#d98f00', 0.55]} />
      <directionalLight
        position={[5, 9, 6]}
        intensity={1.6}
        color="#fff4e0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0002}
        shadow-normalBias={0.02}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={10}
        shadow-camera-bottom={-4}
        shadow-camera-near={1}
        shadow-camera-far={30}
      />
      <directionalLight position={[-6, 4, -3]} intensity={0.5} color="#ffe1a8" />
      <spotLight position={[0, 11, -9]} intensity={80} angle={0.7} color="#fff3d6" decay={1.6} />

      {/* Local studio environment — no network HDR needed */}
      <Environment resolution={128}>
        <Lightformer position={[0, 6, 0]} rotation-x={-Math.PI / 2} scale={[9, 9, 1]} intensity={2.2} color="#fff6e5" />
        <Lightformer position={[-6, 3, 2]} rotation-y={Math.PI / 2} scale={[6, 2, 1]} intensity={1.4} color="#ffd98f" />
        <Lightformer position={[6, 3, 2]} rotation-y={-Math.PI / 2} scale={[6, 2, 1]} intensity={1.1} color="#ffe9c4" />
        <Lightformer position={[0, 3, -7]} scale={[10, 3, 1]} intensity={0.8} color="#ffc25e" />
      </Environment>

      <FriesModel />
      <CameraRig />
    </>
  )
}
