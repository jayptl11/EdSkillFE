import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CalendarCheck2, Clock3, LogOut, Sparkles, type LucideIcon } from 'lucide-react'
import { motion } from 'motion/react'
import { SiteHeader } from './Brand'
import { MotionPage } from './MotionPage'
import { dashboardCards } from './learningData'

export function DashboardShell({
  username,
  email,
  roles,
  dailyReminderNeeded,
  primaryRole,
  onLogout,
  profileHref,
  getCardCopy,
}: {
  username: string
  email: string
  roles: string[]
  dailyReminderNeeded: boolean
  primaryRole: string
  onLogout: () => void
  profileHref: string
  getCardCopy: (card: string, role: string) => string
}) {
  return (
    <MotionPage className="page dashboard-page">
      <SiteHeader />
      <section className="dashboard-hero">
        <div>
          <span className="eyebrow">
            <Sparkles size={15} />
            Dashboard {getRoleLabel(primaryRole)}
          </span>
          <h1>Xin chao, {username || email}</h1>
          <p>
            Khong gian EdSkill cua ban da san sang. Chon buoc tiep theo, giu nhip hoc va mo cac
            cong cu wallet, sessions va admin theo dung vai tro.
          </p>
          <div className="role-chip-row">
            {roles.map((role) => (
              <span key={role}>{getRoleLabel(role)}</span>
            ))}
          </div>
          <div className="dashboard-hero-links">
            <Link className="button secondary" to={profileHref}>
              Cap nhat ho so
            </Link>
            <Link className="button secondary" to="/dashboard/wallet">
              Wallet
            </Link>
            <Link className="button secondary" to="/dashboard/sessions/marketplace">
              Marketplace
            </Link>
            {roles.includes('learner') ? (
              <Link className="button secondary" to="/dashboard/sessions/learning">
                Learning sessions
              </Link>
            ) : null}
            {roles.includes('companion') ? (
              <>
                <Link className="button secondary" to="/dashboard/sessions/teaching">
                  Teaching sessions
                </Link>
                <Link className="button secondary" to="/dashboard/sessions/new">
                  Tao offer
                </Link>
              </>
            ) : null}
            {roles.includes('admin') ? (
              <>
                <Link className="button secondary" to="/dashboard/admin/session-wallet">
                  Session wallet admin
                </Link>
                <Link className="button secondary" to="/dashboard/admin/skills">
                  Quan ly skills
                </Link>
              </>
            ) : null}
          </div>
        </div>
        <motion.button
          className="button secondary logout-button"
          onClick={onLogout}
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.98 }}
        >
          <LogOut size={18} />
          Dang xuat
        </motion.button>
      </section>
      <motion.section
        animate="visible"
        className="dashboard-grid"
        initial="hidden"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.08 } },
        }}
      >
        {dashboardCards.map(({ title, Icon }, index) => (
          <DashboardCard Icon={Icon} index={index} key={title} title={title}>
            {getCardCopy(title, primaryRole)}
          </DashboardCard>
        ))}
      </motion.section>
      <section className="learning-summary">
        <div className="next-step-card">
          <span className="summary-icon">
            <CalendarCheck2 size={22} />
          </span>
          <div>
            <h2>Buoc hoc tiep theo</h2>
            <p>Hoan thien ho so, wallet va cac session flow dau tien cua ban.</p>
          </div>
          <span className="summary-progress">
            <span />
          </span>
        </div>
        <div className="session-panel">
          <h2>Phien dang nhap</h2>
          <dl>
            <div>
              <dt>Email</dt>
              <dd>{email}</dd>
            </div>
            <div>
              <dt>Vai tro</dt>
              <dd>{roles.map(getRoleLabel).join(', ')}</dd>
            </div>
            <div>
              <dt>Nhac hoc</dt>
              <dd>{dailyReminderNeeded ? 'Can thiet lap' : 'Chua can'}</dd>
            </div>
          </dl>
        </div>
        <div className="study-pulse">
          <Clock3 size={28} />
          <strong>15 phut</strong>
          <span>goi y cho phien hoc dau</span>
        </div>
      </section>
      <section className="dashboard-quick-links">
        <Link className="dashboard-quick-link" to="/dashboard/wallet">
          <strong>Wallet</strong>
          <span>Theo doi balance, held points va transaction history.</span>
        </Link>
        <Link className="dashboard-quick-link" to="/dashboard/sessions/marketplace">
          <strong>Marketplace</strong>
          <span>Xem session Available, book nhanh va theo doi detail.</span>
        </Link>
        {roles.includes('learner') ? (
          <Link className="dashboard-quick-link" to="/dashboard/sessions/learning">
            <strong>My learning sessions</strong>
            <span>Danh sach session ban da book trong vai tro learner.</span>
          </Link>
        ) : null}
        {roles.includes('companion') ? (
          <Link className="dashboard-quick-link" to="/dashboard/sessions/teaching">
            <strong>My teaching sessions</strong>
            <span>Quan ly offer, confirm, reject va theo doi pending review.</span>
          </Link>
        ) : null}
      </section>
    </MotionPage>
  )
}

const getRoleLabel = (role: string) => {
  if (role === 'admin') {
    return 'Admin'
  }

  if (role === 'companion') {
    return 'Companion'
  }

  return 'Learner'
}

function DashboardCard({
  title,
  Icon,
  index,
  children,
}: {
  title: string
  Icon: LucideIcon
  index: number
  children: ReactNode
}) {
  return (
    <motion.article
      className="dashboard-card"
      variants={{
        hidden: { opacity: 0, y: 18, scale: 0.96 },
        visible: { opacity: 1, y: 0, scale: 1 },
      }}
      whileHover={{ y: -6 }}
    >
      <span className="card-number">{String(index + 1).padStart(2, '0')}</span>
      <span className="dashboard-card-icon">
        <Icon size={24} />
      </span>
      <h2>{title}</h2>
      <p>{children}</p>
    </motion.article>
  )
}
