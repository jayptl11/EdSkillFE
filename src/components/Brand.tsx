import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import edSkillLogo from '../assets/edskill-logo.png'
import { useAppStore } from '../store/useAppStore'

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

export function SiteHeader() {
  const session = useAppStore((state) => state.session)

  return (
    <motion.header
      animate={{ opacity: 1, y: 0 }}
      className="site-header"
      initial={{ opacity: 0, y: -14 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <LogoLink />
      <nav>
        <Link className="nav-link" to="/policies">
          Chinh sach
        </Link>
        {session ? (
          <>
            <Link className="nav-link" to="/dashboard/sessions/marketplace">
              Sessions
            </Link>
            <Link className="nav-link" to="/dashboard/wallet">
              Wallet
            </Link>
            <Link className="nav-link" to="/dashboard/profile">
              Ho so
            </Link>
            <Link className="nav-link highlighted" to="/dashboard">
              Dashboard
            </Link>
          </>
        ) : (
          <>
            <Link className="nav-link" to="/login">
              Dang nhap
            </Link>
            <Link className="nav-link highlighted" to="/register">
              Tham gia
            </Link>
          </>
        )}
      </nav>
    </motion.header>
  )
}
