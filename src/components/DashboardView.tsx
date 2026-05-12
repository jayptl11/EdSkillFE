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
            Khu vực {getRoleLabel(primaryRole).toLowerCase()}
          </span>
          <h1>Xin chào, {username || email}</h1>
          <p>
            Mọi thứ bạn cần để học, dạy và theo dõi tiến trình đang ở đây. Chọn đúng việc
            tiếp theo để bắt đầu nhanh hơn.
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
              <>
                <Link className="button secondary" to="/dashboard/admin/session-wallet">
                  Quản trị ví điểm
                </Link>
                <Link className="button secondary" to="/dashboard/admin/skills">
                  Quản lý kỹ năng
                </Link>
              </>
            ) : (
              <>
                <Link className="button secondary" to="/dashboard/wallet">
                  Ví điểm
                </Link>
                <Link className="button secondary" to="/dashboard/skills/marketplace">
                  Tìm buổi học
                </Link>
                {roles.includes('learner') ? (
                  <Link className="button secondary" to="/dashboard/skills/learning">
                    Buổi học của tôi
                  </Link>
                ) : null}
                {roles.includes('companion') ? (
                  <>
                    <Link className="button secondary" to="/dashboard/skills/teaching">
                      Lịch dạy của tôi
                    </Link>
                    <Link className="button secondary" to="/dashboard/skills/new">
                      Mở buổi học
                    </Link>
                  </>
                ) : null}
              </>
            )}
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
            <h2>Bước nên làm tiếp</h2>
            <p>Hoàn thiện hồ sơ, kiểm tra ví điểm và chốt buổi học đầu tiên của bạn.</p>
          </div>
          <span className="summary-progress">
            <span />
          </span>
        </div>
        <div className="session-panel">
          <h2>Thông tin tài khoản</h2>
          <dl>
            <div>
              <dt>Email</dt>
              <dd>{email}</dd>
            </div>
            <div>
              <dt>Vai trò</dt>
              <dd>{roles.map(getRoleLabel).join(', ')}</dd>
            </div>
            <div>
              <dt>Nhắc học</dt>
              <dd>{dailyReminderNeeded ? 'Cần thiết lập' : 'Đã ổn'}</dd>
            </div>
          </dl>
        </div>
        <div className="study-pulse">
          <Clock3 size={28} />
          <strong>15 phút</strong>
          <span>để hoàn thiện bước khởi đầu hôm nay</span>
        </div>
      </section>
      <section className="dashboard-quick-links">
        {roles.includes('admin') ? (
          <>
            <Link className="dashboard-quick-link" to="/dashboard/admin/session-wallet">
              <strong>Quản trị ví điểm</strong>
              <span>Cấu hình hệ thống điểm và cấp phát điểm hàng loạt.</span>
            </Link>
            <Link className="dashboard-quick-link" to="/dashboard/admin/skills">
              <strong>Quản lý kỹ năng</strong>
              <span>Quản lý danh mục kỹ năng và cấu hình hệ thống.</span>
            </Link>
          </>
        ) : (
          <>
            <Link className="dashboard-quick-link" to="/dashboard/wallet">
              <strong>Ví điểm</strong>
              <span>Theo dõi số dư, điểm đang giữ và mọi thay đổi gần đây.</span>
            </Link>
            <Link className="dashboard-quick-link" to="/dashboard/skills/marketplace">
              <strong>Tìm buổi học</strong>
              <span>Xem các buổi học đang mở và chọn lịch phù hợp với bạn.</span>
            </Link>
            {roles.includes('learner') ? (
              <Link className="dashboard-quick-link" to="/dashboard/skills/learning">
                <strong>Buổi học của tôi</strong>
                <span>Theo dõi các buổi học bạn đã đăng ký và những việc cần xác nhận.</span>
              </Link>
            ) : null}
            {roles.includes('companion') ? (
              <Link className="dashboard-quick-link" to="/dashboard/skills/teaching">
                <strong>Lịch dạy của tôi</strong>
                <span>Quản lý buổi học, xác nhận lịch và mở thêm buổi học mới.</span>
              </Link>
            ) : null}
          </>
        )}
      </section>
    </MotionPage>
  )
}

const getRoleLabel = (role: string) => {
  if (role === 'admin') {
    return 'Quản trị'
  }

  if (role === 'companion') {
    return 'Người dạy'
  }

  return 'Người học'
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
