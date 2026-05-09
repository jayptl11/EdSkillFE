import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import edSkillLogo from '../assets/edskill-logo.png'
import { useAppStore } from '../store/useAppStore'

export function LogoImage({ size = 'default' }: { size?: 'default' | 'large' }) {
  return (
    <img
      className={`brand-logo-image ${size}`}
      src={edSkillLogo}
      alt="EdSkill"
    />
  )
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
      className="site-header"
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <LogoLink />
      <nav>
        {session ? (
          <Link className="nav-link highlighted" to="/dashboard">
            Bảng điều khiển
          </Link>
        ) : (
          <>
            <Link className="nav-link" to="/login">
              Đăng nhập
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
