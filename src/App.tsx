import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import MarketingLayout from '@/pages/MarketingLayout'
import Home from '@/pages/Home'
import HowItWorks from '@/pages/HowItWorks'
import WhatYouGet from '@/pages/WhatYouGet'
import Pricing from '@/pages/Pricing'
import Faq from '@/pages/Faq'
import About from '@/pages/About'
import Contact from '@/pages/Contact'
import Terms from '@/pages/Terms'
import Privacy from '@/pages/Privacy'
import Disclaimer from '@/pages/Disclaimer'
import Questionnaire from '@/pages/Questionnaire'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="questionnaire" element={<Questionnaire />} />
        <Route element={<MarketingLayout />}>
          <Route index element={<Home />} />
          <Route path="how-it-works" element={<HowItWorks />} />
          <Route path="what-you-get" element={<WhatYouGet />} />
          <Route path="pricing" element={<Pricing />} />
          <Route path="faq" element={<Faq />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
          <Route path="terms" element={<Terms />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="disclaimer" element={<Disclaimer />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
