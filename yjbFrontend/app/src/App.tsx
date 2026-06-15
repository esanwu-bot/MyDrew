import { Routes, Route } from 'react-router'
import Home from './pages/Home'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import Marketplace from './pages/Marketplace'
import ServiceDetail from './pages/ServiceDetail'
import Orders from './pages/Orders'
import Profile from './pages/Profile'
import PublishRequirement from './pages/PublishRequirement'
import SmartMatch from './pages/SmartMatch'
import RequirementsHall from './pages/RequirementsHall'
import CaseDetail from './pages/CaseDetail'
import OrderDetail from './pages/OrderDetail'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ChatWidget from './components/ChatWidget'

export default function App() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/service/:slug" element={<ServiceDetail />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/order/:id" element={<OrderDetail />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/publish" element={<PublishRequirement />} />
          <Route path="/requirements" element={<RequirementsHall />} />
          <Route path="/case/:id" element={<CaseDetail />} />
          <Route path="/smart-match" element={<SmartMatch />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <ChatWidget />
    </div>
  )
}
