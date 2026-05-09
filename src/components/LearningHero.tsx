import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Code2,
  Play,
  Sparkles,
  Star,
  Trophy,
} from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { LogoImage } from './Brand'
import { learningTracks } from './learningData'

const floatTransition = {
  duration: 4.8,
  repeat: Infinity,
  repeatType: 'mirror' as const,
  ease: 'easeInOut' as const,
}

export function LearningHero({ isSignedIn }: { isSignedIn: boolean }) {
  const reduceMotion = useReducedMotion()

  return (
    <section className="hero-section">
      <motion.div
        className="hero-copy"
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="eyebrow">
          <Sparkles size={15} />
          Học điều bạn cần. Chia sẻ điều bạn giỏi.
        </span>
        <h1>
          Học kỹ năng cùng người đồng hành, không phải một bảng điều khiển khô khan.
        </h1>
        <p>
          EdSkill biến bước khởi đầu thành một góc học tập thân thiện: chọn vai trò,
          xác thực an toàn và bắt đầu xây dựng lộ trình kỹ năng thực tế.
        </p>
        <div className="hero-actions">
          <motion.div whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }}>
            <Link className="button primary" to={isSignedIn ? '/dashboard' : '/register'}>
              Bắt đầu học
              <ArrowRight size={18} />
            </Link>
          </motion.div>
          <motion.div whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }}>
            <Link className="button secondary" to="/login">
              <Play size={18} />
              Đăng nhập
            </Link>
          </motion.div>
        </div>
        <div className="hero-proof">
          <span>
            <CheckCircle2 size={18} />
            Theo vai trò
          </span>
          <span>
            <CheckCircle2 size={18} />
            Bảo mật OTP
          </span>
          <span>
            <CheckCircle2 size={18} />
            Sẵn sàng học
          </span>
        </div>
      </motion.div>

      <motion.div
        className="learning-stage"
        initial={{ opacity: 0, scale: 0.95, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.62, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          className="stage-orbit orbit-a"
          animate={reduceMotion ? undefined : { y: [0, -16, 0], rotate: [-2, 2, -2] }}
          transition={floatTransition}
        >
          <Sparkles size={18} />
          Chuỗi học tập
        </motion.div>
        <motion.div
          className="stage-orbit orbit-b"
          animate={reduceMotion ? undefined : { y: [0, 14, 0], rotate: [2, -2, 2] }}
          transition={{ ...floatTransition, duration: 5.4 }}
        >
          <Trophy size={18} />
          Mục tiêu mở khóa
        </motion.div>

        <div className="stage-card hero-main-card">
          <div className="hero-main-card-top">
            <LogoImage size="large" />
            <div>
              <span>Lộ trình hôm nay</span>
              <strong>Xây bậc thang kỹ năng đầu tiên</strong>
            </div>
          </div>
          <div className="skill-path">
            <span className="path-node active">
              <BookOpen size={18} />
            </span>
            <span className="path-line" />
            <span className="path-node active">
              <Code2 size={18} />
            </span>
            <span className="path-line muted" />
            <span className="path-node">
              <Star size={18} />
            </span>
          </div>
          <div className="progress-card">
            <div>
              <span>Tiến độ khóa học</span>
              <strong>68%</strong>
            </div>
            <span className="progress-track">
              <span />
            </span>
          </div>
        </div>

        <div className="stage-card quiz-preview">
          <span>Câu hỏi nhanh</span>
          <div className="quiz-row active">A. Luyện tập mỗi ngày</div>
          <div className="quiz-row">B. Bỏ qua nền tảng</div>
          <div className="quiz-row">C. Để sau rồi tính</div>
        </div>

        <motion.div
          className="track-cloud"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.055, delayChildren: 0.22 } },
          }}
        >
          {learningTracks.map(({ label, Icon, tone }) => (
            <motion.div
              className={`track-chip ${tone}`}
              key={label}
              variants={{
                hidden: { opacity: 0, y: 16, scale: 0.94 },
                visible: { opacity: 1, y: 0, scale: 1 },
              }}
              whileHover={reduceMotion ? undefined : { y: -6, rotate: -1 }}
            >
              <Icon size={18} />
              <span>{label}</span>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  )
}
