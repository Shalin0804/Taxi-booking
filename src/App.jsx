import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, LazyMotion, domAnimation, m } from 'framer-motion'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import { EASE, scrollToTop } from './lib/motion'
import { AuthProvider } from './lib/auth'
import { ADMIN_BASE } from './admin/base'

const About = lazy(() => import('./pages/About'))
const Services = lazy(() => import('./pages/Services'))
const ServiceDetail = lazy(() => import('./pages/ServiceDetail'))
const Fleet = lazy(() => import('./pages/Fleet'))
const Corporate = lazy(() => import('./pages/Corporate'))
const Contact = lazy(() => import('./pages/Contact'))
const Book = lazy(() => import('./pages/Book'))
const NotFound = lazy(() => import('./pages/NotFound'))
const auth = (name) => lazy(() => import('./pages/AuthPages').then((mod) => ({ default: mod[name] })))
const Login = auth('Login')
const Register = auth('Register')
const ForgotPassword = auth('ForgotPassword')
const ResetPassword = auth('ResetPassword')
const MyAccount = lazy(() => import('./pages/MyAccount'))
const AdminApp = lazy(() => import('./admin/AdminApp'))

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait" onExitComplete={scrollToTop}>
      <m.div
        key={location.pathname.startsWith('/my-account') ? '/my-account' : location.pathname}
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
            <Route path="/register" element={<Register />} />
            <Route path="/signup" element={<Navigate to="/register" replace />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/my-account/*" element={<MyAccount />} />
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
  // The admin portal lives only at this unlinked URL, with its own layout and session.
  if (pathname === ADMIN_BASE || pathname.startsWith(ADMIN_BASE + '/')) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-midnight" />}>
        <AdminApp />
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
