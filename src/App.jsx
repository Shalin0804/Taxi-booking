import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, LazyMotion, domAnimation, m } from 'framer-motion'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import { EASE, scrollToTop } from './lib/motion'
import { AuthProvider } from './lib/auth'

const About = lazy(() => import('./pages/About'))
const Services = lazy(() => import('./pages/Services'))
const ServiceDetail = lazy(() => import('./pages/ServiceDetail'))
const Fleet = lazy(() => import('./pages/Fleet'))
const Corporate = lazy(() => import('./pages/Corporate'))
const Contact = lazy(() => import('./pages/Contact'))
const Book = lazy(() => import('./pages/Book'))
const NotFound = lazy(() => import('./pages/NotFound'))
const Login = lazy(() => import('./pages/AuthPages').then((mod) => ({ default: mod.Login })))
const Signup = lazy(() => import('./pages/AuthPages').then((mod) => ({ default: mod.Signup })))
const AdminLoginRedirect = lazy(() => import('./pages/AuthPages').then((mod) => ({ default: mod.AdminLoginRedirect })))
const Account = lazy(() => import('./pages/Account'))
const AdminApp = lazy(() => import('./admin/AdminApp'))

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait" onExitComplete={scrollToTop}>
      <m.div
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { duration: 0.6, ease: EASE } }}
        exit={{ opacity: 0, transition: { duration: 0.35, ease: EASE } }}
      >
        <Suspense fallback={<div className="min-h-screen bg-midnight" />}>
          <Routes location={location}>
            <Route path="/" element={<Home />} />
            <Route path="/home" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/services" element={<Services />} />
            <Route path="/services/:slug" element={<ServiceDetail />} />
            <Route path="/fleet" element={<Fleet />} />
            <Route path="/corporate" element={<Corporate />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/book" element={<Book />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/account" element={<Account />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </m.div>
    </AnimatePresence>
  )
}

/** The admin dashboard has its own layout; everything else gets the public navbar and footer. */
function Shell() {
  const { pathname } = useLocation()
  if (pathname.startsWith('/admin')) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-midnight" />}>
        <Routes>
          <Route path="/admin/login" element={<AdminLoginRedirect />} />
          <Route path="/admin/*" element={<AdminApp />} />
        </Routes>
      </Suspense>
    )
  }
  return (
    <>
      <Navbar />
      <AnimatedRoutes />
      <Footer />
    </>
  )
}

export default function App() {
  return (
    <LazyMotion features={domAnimation} strict>
    <BrowserRouter>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-gold focus:px-5 focus:py-2.5 focus:text-midnight">
        Skip to content
      </a>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </BrowserRouter>
    </LazyMotion>
  )
}
