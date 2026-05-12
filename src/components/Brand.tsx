import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { Wallet } from 'lucide-react'
import edSkillLogo from '../assets/edskill-logo.png'
import { useAppStore } from '../store/useAppStore'
import { walletApi, walletKeys } from '../features/wallet/walletApi'

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
  const walletQuery = useQuery({
    queryKey: walletKeys.summary(),
    queryFn: walletApi.getSummary,
    enabled: Boolean(session?.accessToken),
  })
  const balance = walletQuery.data?.balance

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
          Chính sách
        </Link>
        {session ? (
          <>
            {session.roles.includes('admin') ? (
              <>
                <Link className="nav-link" to="/dashboard/admin/skills">
                  Quản lý kỹ năng
                </Link>
                <Link className="nav-link" to="/dashboard/admin/session-wallet">
                  Quản trị ví điểm
                </Link>
                <Link className="nav-link nav-wallet-link" to="/dashboard/wallet">
                  <Wallet size={16} />
                  {balance != null ? balance.toLocaleString('vi-VN') : '—'}
                </Link>
                <Link className="nav-link" to="/dashboard/profile">
                  Hồ sơ
                </Link>
                <Link className="nav-link highlighted" to="/dashboard">
                  Trang của tôi
                </Link>
              </>
            ) : (
              <>
                <Link className="nav-link" to="/dashboard/companions">
                  Khám phá skill mới
                </Link>
                <Link className="nav-link" to="/teach">
                  Dạy học
                </Link>
                <Link className="nav-link nav-wallet-link" to="/dashboard/wallet">
                  <Wallet size={16} />
                  {balance != null ? balance.toLocaleString('vi-VN') : '—'}
                </Link>
                <Link className="nav-link" to="/dashboard/profile">
                  Hồ sơ
                </Link>
                <Link className="nav-link highlighted" to="/dashboard">
                  Trang của tôi
                </Link>
              </>
            )}
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
    </motion.header>
  )
}
