import { useEffect } from 'react'
import { ScrollTrigger } from '../landing/gsap'
import { useLenis } from '../landing/useLenis'

import Navbar from '../components/Landing/Navbar'
import Hero from '../components/Landing/Hero'
import ProductAnimation from '../components/Landing/ProductAnimation'
import Intro from '../components/Landing/Intro'
import Features from '../components/Landing/Features'
import Workflow from '../components/Landing/Workflow'
import Showcase from '../components/Landing/Showcase'
import Developers from '../components/Landing/Developers'
import CTA from '../components/Landing/CTA'
import Footer from '../components/Landing/Footer'

import './Landing.css'

export default function Landing() {
  useLenis() // 🔥 Smooth scroll — Lenis wired to GSAP ticker

  useEffect(() => {
    // Web fonts change layout heights; refresh pinned sections once they settle.
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => ScrollTrigger.refresh())
    }
  }, [])

  return (
    <div className='landing-root'>
      <a href='#main' className='skip-link'>
        Skip to content
      </a>
      <Navbar />
      <main id='main'>
        <Hero />
        <ProductAnimation />
        <Intro />
        <Features />
        <Workflow />
        <Showcase />
        <Developers />
        <CTA />
      </main>
      <Footer />
    </div>
  )
}
