import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CalendarCheck2, Clock3, Sparkles, type LucideIcon } from 'lucide-react'
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
  getCardCopy,
}: {
  username: string
  email: string
  roles: string[]
  dailyReminderNeeded: boolean
  primaryRole: string
  getCardCopy: (card: string, role: string) => string
}) {
  return (
    <MotionPage className="page dashboard-page">
      <SiteHeader />
      <section className="dashboard-hero">
        <div>
          <span className="eyebrow">
            <Sparkles size={15} />
            Trang của tôi
          </span>
          <h1>Xin chào, {username || email}</h1>
          <p>
            Mọi thứ bạn cần để học, dạy và theo dõi tiến trình đang ở đây. Chọn đúng việc
            tiếp theo để bắt đầu nhanh hơn.
          </p>
        </div>
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
        <Link className="next-step-card" to="/dashboard/profile">
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
        </Link>
        <div className="session-panel">
          <h2>Thông tin tài khoản</h2>
          <dl>
            <div>
              <dt>Email</dt>
              <dd>{email}</dd>
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
        {!roles.includes('admin') && (
          <>
            <Link className="dashboard-quick-link" to="/dashboard/wallet">
              <strong>Ví điểm</strong>
              <span>Theo dõi số dư, điểm đang giữ và mọi thay đổi gần đây.</span>
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
