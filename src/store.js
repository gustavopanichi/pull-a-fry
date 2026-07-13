import { create } from 'zustand'

// Live mesh refs so the camera rig can follow the selected fry without re-renders.
export const meshRegistry = {}
if (import.meta.env.DEV && typeof window !== 'undefined') window.__meshes = meshRegistry

// Deterministic pseudo-random per fry index — keeps fall jitter stable across renders.
export function seeded(i, salt = 0) {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453
  return x - Math.floor(x)
}

const create_ = (fn) => {
  const store = create(fn)
  if (import.meta.env.DEV && typeof window !== 'undefined') window.__fries = store
  return store
}

export const useStore = create_((set, get) => ({
  phase: 'loading', // loading -> intro -> ready
  setPhase: (phase) => set({ phase }),

  fries: [], // [{ name, isGolden, clickable, projectIndex }] filled once the model parses
  setFries: (fries) => set({ fries }),

  selectedId: null,
  viewed: [], // clickable fry names, in the order their fortunes were discovered
  refillKey: 0,
  hintDismissed: false,
  goldenFlash: 0,
  saltShake: 0,
  shakeSalt: () => set((s) => ({ saltShake: s.saltShake + 1 })),

  selectAt: 0,
  select: (name, isGolden) => {
    const { selectedId, phase } = get()
    if (import.meta.env.DEV)
      console.warn(`[select] ${name} at ${Date.now()} (blocked=${!!selectedId || phase !== 'ready'})`, new Error('trace').stack?.split('\n')[2])
    if (selectedId || phase !== 'ready') return
    set((s) => ({
      selectedId: name,
      selectAt: Date.now(),
      hintDismissed: true,
      goldenFlash: isGolden ? s.goldenFlash + 1 : s.goldenFlash,
    }))
  },

  // The 400ms grace period stops the tail of a select drag-gesture from
  // clicking the freshly-rendered modal and instantly dismissing the fry.
  dismiss: () => {
    if (import.meta.env.DEV)
      console.warn(`[dismiss] sel=${get().selectedId} at ${Date.now()} age=${Date.now() - get().selectAt}ms`)
    set((s) =>
      s.selectedId && Date.now() - s.selectAt > 400
        ? { selectedId: null, viewed: [...s.viewed, s.selectedId] }
        : {},
    )
  },

  // Close the modal without eating the fry — it settles back into the carton.
  close: () =>
    set((s) =>
      s.selectedId && Date.now() - s.selectAt > 400 ? { selectedId: null } : {},
    ),

  refill: () =>
    set((s) => ({
      viewed: [],
      selectedId: null,
      refillKey: s.refillKey + 1,
      phase: 'intro',
    })),
}))
