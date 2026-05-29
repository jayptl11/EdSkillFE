import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'motion/react'
import { Award, BookOpen, CalendarRange, Coins, LogOut, Menu, PlusCircle, Settings, User, Wallet, X } from 'lucide-react'
import edSkillLogo from '../assets/edskill-logo.png'
import { clearUserQueryCache } from '../api/cacheLifecycle'
import { useAppStore } from '../store/useAppStore'
import { walletApi, walletKeys } from '../features/wallet/walletApi'
import { getErrorMessage, logout } from '../api/auth'
import { showToast } from './toastEvents'

export function LogoImage({ size = 'default' }: { size?: 'default' | 'large' }) {
  return <img alt="EdSkill" className={`brand-logo-image ${size}`} src={edSkillLogo} />
}

export function LogoLink() {
  return (
    <Link className="brand-link" to="/">
      <LogoImage />
    </Link>
  )
}

function UserNavDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const session = useAppStore((state) => state.session)
  const clearSession = useAppStore((state) => state.clearSession)
  const navigate = useNavigate()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    if (!session) {
      return
    }

    const userId = session.userId

    try {
      await logout()
    } catch (error) {
      showToast({ kind: 'info', message: getErrorMessage(error) })
    } finally {
      await clearUserQueryCache(userId)
      clearSession()
      navigate('/login', {
        replace: true,
        state: { message: 'Bạn đã đăng xuất thành công.' },
      })
    }
  }

  const close = () => setIsOpen(false)

  if (!session) return null

  return (
    <div className="user-nav-dropdown-container" ref={dropdownRef}>
      <button className="user-dropdown-toggle" onClick={() => setIsOpen(!isOpen)}>
        <User size={20} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="user-dropdown-menu"
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            <div className="dropdown-section">
              <Link className="dropdown-item" onClick={close} to="/dashboard/profile">
                <User size={16} />
                Hồ sơ
              </Link>
            </div>

            <div className="dropdown-divider" />

            {session.roles.includes('admin') && (
              <>
                <div className="dropdown-section">
                  <Link className="dropdown-item" onClick={close} to="/dashboard/admin/skills">
                    <Settings size={16} />
                    Quản lý kỹ năng
                  </Link>
                  <Link className="dropdown-item" onClick={close} to="/dashboard/admin/session-wallet">
                    <Coins size={16} />
                    Quản lý điểm thưởng
                  </Link>
                  <Link className="dropdown-item" onClick={close} to="/dashboard/admin/achievements">
                    <Award size={16} />
                    Quản lý thành tích
                  </Link>
                </div>
                <div className="dropdown-divider" />
              </>
            )}

            <div className="dropdown-section">
              {session.roles.includes('companion') && (
                <>
                  <Link className="dropdown-item" onClick={close} to="/dashboard/skills/teaching">
                    <CalendarRange size={16} />
                    Lịch dạy của tôi
                  </Link>
                  <Link className="dropdown-item" onClick={close} to="/dashboard/skills/new">
                    <PlusCircle size={16} />
                    Mở buổi học
                  </Link>
                </>
              )}
              {session.roles.includes('learner') && (
                <Link className="dropdown-item" onClick={close} to="/dashboard/skills/learning">
                  <BookOpen size={16} />
                  Buổi học của tôi
                </Link>
              )}
            </div>

            <div className="dropdown-divider" />

            <div className="dropdown-section">
              <button className="dropdown-item text-danger" onClick={handleLogout}>
                <LogOut size={16} />
                Đăng xuất
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function SiteHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const location = useLocation()
  const session = useAppStore((state) => state.session)
  const walletQuery = useQuery({
    queryKey: walletKeys.summary(),
    queryFn: walletApi.getSummary,
    enabled: Boolean(session?.accessToken),
  })
  const balance = walletQuery.data?.balance

  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location.pathname])

  return (
    <motion.header
      animate={{ opacity: 1, y: 0 }}
      className="site-header"
      initial={{ opacity: 0, y: -14 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <LogoLink />
      <nav className={isMobileMenuOpen ? 'is-open' : ''}>
        <a className="nav-link" href="#" onClick={(e) => { e.preventDefault(); showToast({ kind: 'info', message: 'Tính năng đang phát triển.' }) }}>
          Giải pháp doanh nghiệp
        </a>
        <a className="nav-link" href="#" onClick={(e) => { e.preventDefault(); showToast({ kind: 'info', message: 'Tính năng đang phát triển.' }) }}>
          Challenge street
        </a>
        <Link className="nav-link" to="/policies">
          Chính sách
        </Link>
        {session ? (
          <>
            {!session.roles.includes('admin') && (
              <Link className="nav-link" to="/dashboard/companions">
                Khám phá skill mới
              </Link>
            )}
            <Link className="nav-link nav-wallet-link" to="/dashboard/wallet">
              <Wallet size={16} />
              {balance != null ? balance.toLocaleString('vi-VN') : '—'}
            </Link>
          </>
        ) : (
          <>
            <Link className="nav-link" to="/login">
              Đăng nhập
            </Link>
            <Link className="nav-link highlighted" to="/register">
              Đăng ký
            </Link>
          </>
        )}
      </nav>
      <div className="header-actions">
        {session && <UserNavDropdown />}
        <button 
          className="mobile-menu-toggle" 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
    </motion.header>
  )
}
