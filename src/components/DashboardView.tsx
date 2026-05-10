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
            Bảng điều khiển {getRoleLabel(primaryRole)}
          </span>
          <h1>Xin chào, {username || email}</h1>
          <p>
            Không gian EdSkill của bạn đã sẵn sàng. Chọn bước tiếp theo, giữ nhịp học và chuẩn bị
            cho các công cụ theo từng vai trò.
          </p>
          <div className="role-chip-row">
            {roles.map((role) => (
              <span key={role}>{getRoleLabel(role)}</span>
            ))}
          </div>
          <div className="dashboard-hero-links">
            <Link className="button secondary" to={profileHref}>
              Cập nhật hồ sơ
            </Link>
            {roles.includes('admin') ? (
              <Link className="button secondary" to="/dashboard/admin/skills">
                Quản lý skills
              </Link>
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
          Đăng xuất
        </motion.button>
      </section>
      <motion.section
        className="dashboard-grid"
        initial="hidden"
        animate="visible"
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
            <h2>Bước học tiếp theo</h2>
            <p>Hoàn thiện hồ sơ và chuẩn bị module lộ trình kỹ năng đầu tiên.</p>
          </div>
          <span className="summary-progress">
            <span />
          </span>
        </div>
        <div className="session-panel">
          <h2>Phiên đăng nhập</h2>
          <dl>
            <div>
              <dt>Địa chỉ email</dt>
              <dd>{email}</dd>
            </div>
            <div>
              <dt>Vai trò</dt>
              <dd>{roles.map(getRoleLabel).join(', ')}</dd>
            </div>
            <div>
              <dt>Nhắc học</dt>
              <dd>{dailyReminderNeeded ? 'Cần thiết lập' : 'Chưa cần'}</dd>
            </div>
          </dl>
        </div>
        <div className="study-pulse">
          <Clock3 size={28} />
          <strong>15 phút</strong>
          <span>gợi ý cho phiên học đầu</span>
        </div>
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
