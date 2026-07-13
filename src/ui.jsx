import { useEffect, useRef, useState } from 'react'
import { useProgress } from '@react-three/drei'
import { useStore } from './store'
import { PROJECTS, FEATURED } from './projects'
import { asset } from './asset'

export function Arches({ className }) {
  return (
    <svg className={className} viewBox="0 0 100 88" aria-hidden="true">
      <defs>
        <clipPath id="arch-feet">
          <rect x="0" y="0" width="100" height="86" />
        </clipPath>
      </defs>
      <g clipPath="url(#arch-feet)">
        <path
          d="M8.5 98 Q29 -37 53.5 98 M46.5 98 Q71 -37 91.5 98"
          fill="none"
          stroke="currentColor"
          strokeWidth="15.5"
          strokeLinecap="round"
        />
      </g>
    </svg>
  )
}

export function Loader() {
  const { progress, active } = useProgress()
  const phase = useStore((s) => s.phase)
  const [gone, setGone] = useState(false)
  const done = phase !== 'loading' && !active

  useEffect(() => {
    if (done) {
      const id = setTimeout(() => setGone(true), 700)
      return () => clearTimeout(id)
    }
  }, [done])

  if (gone) return null
  return (
    <div className={`loader ${done ? 'loader--done' : ''}`} role="status" aria-live="polite">
      <img className="loader__logos" src={asset('img/Logos.png')} alt="McDonald's + partner" />
      <img className="loader__lettering" src={asset('img/pull-a-fry.svg')} alt="Pull-a-Fry" />
      <div className="loader__bar">
        <div className="loader__fill" style={{ width: `${Math.round(progress)}%` }} />
      </div>
      <p className="loader__caption">Salting the batch… {Math.round(progress)}%</p>
    </div>
  )
}

/* Top-center brand lockup (provided asset). */
export function Header() {
  const phase = useStore((s) => s.phase)
  return (
    <header className={`brandbar ${phase === 'loading' ? '' : 'brandbar--in'}`}>
      <img src={asset('img/Logos.png')} alt="McDonald's + partner" />
    </header>
  )
}

/* Huge arched title sitting on the background, behind the 3D scene. */
export function Lettering() {
  const phase = useStore((s) => s.phase)
  return (
    <div className={`lettering ${phase === 'loading' ? '' : 'lettering--in'}`} aria-hidden="true">
      <img src={asset('img/pull-a-fry.svg')} alt="" />
    </div>
  )
}

/* Right-side call to action with a bobbing circled arrow. */
export function Cta() {
  const phase = useStore((s) => s.phase)
  const anySelected = useStore((s) => !!s.selectedId)
  if (phase === 'loading') return null
  return (
    <aside className={`cta ${anySelected ? 'cta--hidden' : ''}`}>
      <span className="cta__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path
            d="M12 18 V6 M7 11 l5 -5 5 5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <p>
        Pull a fry to discover
        <br />
        something <strong>we</strong> cooked
      </p>
    </aside>
  )
}

export function Hud() {
  const phase = useStore((s) => s.phase)
  const fries = useStore((s) => s.fries)
  const viewed = useStore((s) => s.viewed)
  const refill = useStore((s) => s.refill)

  if (phase === 'loading') return null
  const total = fries.filter((f) => f.clickable).length || 7
  const allFound = viewed.length >= total && total > 0
  return (
    <>
      <button className="btn btn--refill" onClick={refill}>
        ↻ New batch
      </button>
      {allFound && (
        <div className="finished">
          <strong>All {total} fries pulled!</strong> That’s the whole batch.
        </div>
      )}
    </>
  )
}

function Carousel({ images, url }) {
  const track = useRef(null)
  const scroll = (dir) =>
    track.current?.scrollBy({ left: dir * track.current.clientWidth * 0.8, behavior: 'smooth' })
  return (
    <div className="carousel">
      <div className="carousel__track" ref={track}>
        {images.map((src) => (
          <a key={src} href={url} target="_blank" rel="noreferrer">
            <img src={src} alt="" loading="lazy" draggable="false" />
          </a>
        ))}
      </div>
      {images.length > 1 && (
        <>
          <button className="carousel__btn carousel__btn--prev" onClick={() => scroll(-1)} aria-label="Previous">
            ‹
          </button>
          <button className="carousel__btn carousel__btn--next" onClick={() => scroll(1)} aria-label="Next">
            ›
          </button>
        </>
      )}
    </div>
  )
}

export function FortuneModal() {
  const selectedId = useStore((s) => s.selectedId)
  const fries = useStore((s) => s.fries)
  const viewedCount = useStore((s) => s.viewed.length)
  const dismiss = useStore((s) => s.dismiss)
  const close = useStore((s) => s.close)

  if (!selectedId) return null
  const fry = fries.find((f) => f.name === selectedId)
  if (!fry) return null
  const project = fry.isGolden
    ? FEATURED
    : PROJECTS[((fry.projectIndex % PROJECTS.length) + PROJECTS.length) % PROJECTS.length]

  return (
    <div
      className="modal-scrim"
      key={selectedId}
      onClick={(e) => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <aside
        className={`modal modal--big ${fry.isGolden ? 'modal--gold' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={project.title}
      >
        <button className="modal__close" onClick={close} aria-label="Close">
          ×
        </button>
        <div className="modal__fortune">
          {fry.isGolden ? '★ The Freshest Fry' : `Fry no. ${viewedCount + 1}`}
        </div>
        <h2 className="modal__title">{project.title}</h2>
        <div className="modal__chips">
          <span className="chip chip--type">{project.type}</span>
          <span className="chip">{project.industry}</span>
        </div>
        <p className="modal__desc">{project.blurb}</p>
        <Carousel images={project.images} url={project.url} />
        <div className="modal__actions">
          <a
            className="btn btn--primary"
            href={project.url}
            target="_blank"
            rel="noreferrer"
          >
            View full case study
          </a>
          <button className="btn btn--ghost" onClick={dismiss}>
            Eat the fry
          </button>
        </div>
      </aside>
    </div>
  )
}

export function GoldenFlash() {
  const flash = useStore((s) => s.goldenFlash)
  if (!flash) return null
  return <div className="golden-flash" key={flash} aria-hidden="true" />
}

/* Static fallback when WebGL isn't available (very old devices, disabled GPU). */
export function FallbackSite() {
  const all = [FEATURED, ...PROJECTS]
  return (
    <div className="fallback">
      <header className="header header--in" style={{ position: 'static' }}>
        <div className="header__brand">
          <Arches className="header__arches" />
          <span className="header__name">
            Fries of<br />Fortune
          </span>
        </div>
        <p className="header__tagline">
          Your device can’t render the 3D carton — here are the fries, laid flat.
        </p>
      </header>
      <div className="fallback__grid">
        {all.map((p) => (
          <article className={`modal modal--static ${p.featured ? 'modal--gold' : ''}`} key={p.title}>
            <h2 className="modal__title">{p.title}</h2>
            <div className="modal__chips">
              <span className="chip chip--type">{p.type}</span>
              <span className="chip">{p.industry}</span>
            </div>
            <p className="modal__desc">{p.blurb}</p>
            <a className="btn btn--primary" href={p.url} target="_blank" rel="noreferrer">
              View full case study
            </a>
          </article>
        ))}
      </div>
    </div>
  )
}
