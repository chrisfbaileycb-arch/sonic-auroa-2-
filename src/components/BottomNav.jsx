import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Library, Radio, User, Compass, Crown } from 'lucide-react'
import { auth } from '../lib/auth'
import { useMembership } from '../hooks/useMembership'

const items = [
  { to: '/', label: 'Library', icon: Library, end: true },
  { to: '/attune', label: 'Attune', icon: Compass },
  { to: '/session', label: 'Session', icon: Radio },
]

export default function BottomNav() {
  const [user, setUser] = useState(auth.getCurrentUser())
  const { isMember, trialLeft } = useMembership()

  useEffect(() => auth.onAuthChange(setUser), [])

  // the owner's own account tab reads "Artist Portal" instead of their name —
  // nobody else's account tab is affected, since each listener only ever sees their own name here
  const isOwner = auth.isAppOwner()
  const firstName = isOwner ? 'Artist Portal' : (user?.displayName ? user.displayName.split(' ')[0] : null)

  return (
    <>
      {/* Mobile bottom bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 pb-[env(safe-area-inset-bottom,0px)] bg-[#070d14]/75 backdrop-blur-2xl border-t border-white/10">
        <div className="flex items-stretch justify-around px-1">
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-2.5 px-1 flex-1 min-w-0 transition-colors ${
                  isActive ? 'text-[rgb(212,175,120)]' : 'text-white/45'
                }`
              }
            >
              <Icon size={20} strokeWidth={1.8} />
              <span className="text-[9.5px] tracking-wide font-serif-elegant">{label}</span>
            </NavLink>
          ))}
          <button
            onClick={() => auth.signIn()}
            className="flex flex-col items-center gap-1 py-2.5 px-1 flex-1 min-w-0 text-white/45"
          >
            <User size={20} strokeWidth={1.8} />
            <span className="text-[9.5px] tracking-wide font-serif-elegant truncate max-w-full">
              {firstName || 'Account'}
            </span>
          </button>
        </div>
      </nav>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-60 shrink-0 flex-col border-r border-white/10 bg-[#070d14]/60 backdrop-blur-2xl pt-[env(safe-area-inset-top,0px)]">
        <div className="px-6 pt-8 pb-6">
          <h1 className="font-display text-4xl text-white tracking-wide">SonicAurora</h1>
          <p className="text-white/40 text-xs mt-1 font-serif-elegant italic">Sound Frequency Healing</p>
        </div>
        <div className="flex flex-col gap-1 px-3">
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  isActive ? 'bg-white/10 text-[rgb(212,175,120)]' : 'text-white/50 hover:bg-white/5 hover:text-white/80'
                }`
              }
            >
              <Icon size={18} strokeWidth={1.8} />
              <span className="text-sm font-medium">{label}</span>
            </NavLink>
          ))}
        </div>

        <div className="mt-auto px-3 pb-6 space-y-1">
          <NavLink
            to="/membership"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                isActive ? 'bg-white/10 text-[rgb(212,175,120)]' : 'text-white/50 hover:bg-white/5 hover:text-white/80'
              }`
            }
          >
            <Crown size={18} strokeWidth={1.8} />
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-medium truncate">
                {isMember ? 'Active Member' : 'Become a Member'}
              </span>
              {!isMember && (
                <span className="block text-[10px] text-white/35 truncate">
                  {trialLeft > 0 ? `${Math.ceil(trialLeft / 60)} free min left` : 'Free trial complete'}
                </span>
              )}
            </span>
          </NavLink>
          <button
            onClick={() => auth.signIn()}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/50 hover:bg-white/5 hover:text-white/80 transition-colors"
          >
            <User size={18} strokeWidth={1.8} />
            <span className="text-sm font-medium truncate">{firstName || 'Account'}</span>
          </button>
        </div>
      </aside>
    </>
  )
}
