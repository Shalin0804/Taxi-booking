import { Link } from 'react-router-dom'
import Seo from '../components/Seo'
import { Page } from '../components/ui'

export default function NotFound() {
  return (
    <Page>
      <Seo title="Page not found" path="/404" description="This page doesn't exist." />
      <meta name="robots" content="noindex" />
      <section className="grid min-h-[80svh] place-items-center bg-midnight px-4 pt-24 text-center text-white">
        <div>
          <h1 className="display">Wrong turn.</h1>
          <p className="lede mx-auto mt-6 text-white/70">This page doesn't exist. Let's get you back on the road.</p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link to="/" className="btn btn-gold">Go to home</Link>
            <Link to="/book" className="btn btn-ghost">Book a ride</Link>
          </div>
        </div>
      </section>
    </Page>
  )
}
