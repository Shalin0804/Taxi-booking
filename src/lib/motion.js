import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

gsap.registerPlugin(ScrollTrigger)

export const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const EASE = [0.22, 1, 0.36, 1]

let lenis = null
export const getLenis = () => lenis

export function initSmoothScroll() {
  if (lenis || reducedMotion()) return
  document.documentElement.classList.add('fx')
  lenis = new Lenis({ duration: 1.15, smoothWheel: true, anchors: { offset: -90 } })
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((t) => lenis.raf(t * 1000))
  gsap.ticker.lagSmoothing(0)
}

export function scrollToTop() {
  if (lenis) lenis.scrollTo(0, { immediate: true })
  else window.scrollTo(0, 0)
}

/**
 * Declarative scroll effects for a page, driven by data attributes:
 *   data-reveal            fade/slide up once in view (siblings inside data-stagger cascade)
 *   data-mask              image unmasks from the bottom (clip-path)
 *   data-parallax="0.15"   image drifts against scroll
 *   data-counter="11"      number counts up once in view
 */
export function useScrollFx(ref, deps = []) {
  useEffect(() => {
    if (reducedMotion() || !ref.current) return
    const ctx = gsap.context(() => {
      const root = ref.current
      root.querySelectorAll('[data-stagger]').forEach((group) => {
        const items = group.querySelectorAll(':scope > [data-reveal]')
        gsap.to(items, {
          opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.09,
          scrollTrigger: { trigger: group, start: 'top 96%', once: true },
        })
      })
      root.querySelectorAll('[data-reveal]').forEach((el) => {
        if (el.parentElement?.hasAttribute('data-stagger')) return
        gsap.to(el, {
          opacity: 1, y: 0, duration: 1.1, ease: 'expo.out',
          scrollTrigger: { trigger: el, start: 'top 96%', once: true },
        })
      })
      root.querySelectorAll('[data-mask]').forEach((el) => {
        const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 85%', once: true } })
        tl.to(el, { clipPath: 'inset(0% 0 0 0)', duration: 1.4, ease: 'expo.inOut' })
        const inner = el.querySelector('img')
        if (inner) tl.from(inner, { scale: 1.25, duration: 1.8, ease: 'expo.out' }, 0)
      })
      root.querySelectorAll('[data-parallax]').forEach((el) => {
        const amt = parseFloat(el.dataset.parallax) || 0.12
        gsap.fromTo(el, { yPercent: -amt * 50 }, {
          yPercent: amt * 50, ease: 'none',
          scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
        })
      })
      root.querySelectorAll('[data-counter]').forEach((el) => {
        const end = parseFloat(el.dataset.counter)
        const obj = { v: 0 }
        gsap.to(obj, {
          v: end, duration: 1.8, ease: 'power3.out',
          onUpdate: () => { el.textContent = Math.round(obj.v) },
          scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        })
      })
    }, ref)
    const refresh = () => ScrollTrigger.refresh()
    window.addEventListener('load', refresh)
    const t = setTimeout(refresh, 400)
    return () => {
      clearTimeout(t)
      window.removeEventListener('load', refresh)
      ctx.revert()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
