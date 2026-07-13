import * as THREE from 'three'

// Golden arches drawn to canvas: two overlapping parabolas, thick strokes,
// rounded apexes and flat-cut feet (clipped at the baseline), ~583:512 aspect.
export function makeArchesTexture(size = 1024) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = Math.round(size * (512 / 583))
  const ctx = canvas.getContext('2d')
  const w = canvas.width
  const h = canvas.height
  const baseline = h * 0.985

  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, w, baseline) // flat feet: clip strokes at the baseline
  ctx.clip()

  ctx.strokeStyle = '#FFBC0D'
  ctx.lineWidth = w * 0.165
  ctx.lineCap = 'round'
  ctx.beginPath()
  // left arch
  ctx.moveTo(w * 0.088, h * 1.14)
  ctx.quadraticCurveTo(w * 0.29, h * -0.46, w * 0.535, h * 1.14)
  // right arch
  ctx.moveTo(w * 0.465, h * 1.14)
  ctx.quadraticCurveTo(w * 0.71, h * -0.46, w * 0.912, h * 1.14)
  ctx.stroke()
  ctx.restore()

  // small ® next to the right foot
  ctx.fillStyle = '#FFBC0D'
  ctx.font = `600 ${Math.round(w * 0.075)}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('®', w * 0.965, h * 0.93)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}
