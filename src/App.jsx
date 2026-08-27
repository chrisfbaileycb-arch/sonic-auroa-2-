import { HashRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { MembershipProvider } from './hooks/useMembership'
import { PlayerProvider } from './hooks/usePlayer'
import AuraBackdrop from './components/AuraBackdrop'
import BottomNav from './components/BottomNav'
import MiniPlayer from './components/MiniPlayer'
import UnlockModal from './components/UnlockModal'
import Home from './pages/Home'
import FrequencyDetail from './pages/FrequencyDetail'
import Session from './pages/Session'
import Attune from './pages/Attune'
import Membership from './pages/Membership'

function ScrollReset({ scrollRef }) {
  const { pathname } = useLocation()
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [pathname])
  return null
}

function Shell() {
  const scrollRef = useRef(null)
  return (
    <div className="h-full flex relative z-10">
      <BottomNav />
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <main
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto pb-[calc(88px+env(safe-area-inset-bottom,0px))] md:pb-8"
        >
          <ScrollReset scrollRef={scrollRef} />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/track/:slug" element={<FrequencyDetail />} />
            <Route path="/attune" element={<Attune />} />
            <Route path="/session" element={<Session />} />
            <Route path="/membership" element={<Membership />} />
          </Routes>
        </main>
      </div>
      <MiniPlayer />
      <UnlockModal />
    </div>
  )
}

export default function App() {
  return (
    <MembershipProvider>
      <PlayerProvider>
        <AuraBackdrop />
        <HashRouter>
          <Shell />
        </HashRouter>
      </PlayerProvider>
    </MembershipProvider>
  )
}
