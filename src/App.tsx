import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import MarketingLayout from '@/pages/MarketingLayout'
import Home from '@/pages/Home'
import HowItWorks from '@/pages/HowItWorks'
import WhatYouGet from '@/pages/WhatYouGet'
import Plans from '@/pages/Plans'
import Pricing from '@/pages/Pricing'
import Faq from '@/pages/Faq'
import About from '@/pages/About'
import Contact from '@/pages/Contact'
import Terms from '@/pages/Terms'
import Privacy from '@/pages/Privacy'
import Disclaimer from '@/pages/Disclaimer'
import Notary from '@/pages/Notary'
import Questionnaire from '@/pages/Questionnaire'
import Qualify from '@/pages/Qualify'
import QualifyOffRamp from '@/pages/QualifyOffRamp'
import Summary from '@/pages/Summary'
import Auth from '@/pages/Auth'
import AdminLayout from '@/pages/admin/AdminLayout'
import OrdersQueue from '@/pages/admin/OrdersQueue'
import OrderDetail from '@/pages/admin/OrderDetail'
import SkeletonEditor from '@/pages/admin/content/SkeletonEditor'
import PromptsEditor from '@/pages/admin/content/PromptsEditor'
import QuestionnaireEditor from '@/pages/admin/content/QuestionnaireEditor'
import QuestionnaireFormEditor from '@/pages/admin/content/QuestionnaireFormEditor'

function RedirectOrderReviewToLayouts() {
  const { orderId } = useParams()
  return <Navigate to={`/admin/orders/${orderId}?tab=layouts`} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="questionnaire" element={<Questionnaire />} />
        <Route path="qualify" element={<Qualify />} />
        <Route path="qualify/off-ramp" element={<QualifyOffRamp />} />
        <Route path="summary" element={<Summary />} />
        <Route path="pricing" element={<Pricing />} />
        <Route path="auth" element={<Auth />} />
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<OrdersQueue />} />
          <Route path="orders/:orderId" element={<OrderDetail />} />
          <Route path="orders/:orderId/review" element={<RedirectOrderReviewToLayouts />} />
          <Route path="content" element={<Navigate to="/admin/content/questionnaire" replace />} />
          <Route path="content/skeleton" element={<SkeletonEditor />} />
          <Route path="content/prompts" element={<PromptsEditor />} />
          <Route path="content/questionnaire" element={<QuestionnaireEditor />} />
          <Route path="content/questionnaire/:formId" element={<QuestionnaireFormEditor />} />
        </Route>
        <Route element={<MarketingLayout />}>
          <Route index element={<Home />} />
          <Route path="how-it-works" element={<HowItWorks />} />
          <Route path="what-you-get" element={<WhatYouGet />} />
          <Route path="plans" element={<Plans />} />
          <Route path="faq" element={<Faq />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
          <Route path="notary" element={<Notary />} />
          <Route path="terms" element={<Terms />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="disclaimer" element={<Disclaimer />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
