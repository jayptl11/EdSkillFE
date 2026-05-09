import { type ReactNode } from 'react'
import {
  BookOpen,
  Check,
  GraduationCap,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { SiteHeader } from './Brand'
import { MotionPage } from './MotionPage'
import panelLearning from '../assets/panel-learning.png'
import { learningTracks } from './learningData'

export function AuthPage({
  title,
  subtitle,
  panelLabel,
  panelTitle,
  panelLines,
  children,
  accent = 'secure',
}: {
  title: string
  subtitle: string
  panelLabel: string
  panelTitle: string
  panelLines: string[]
  children: ReactNode
  accent?: 'secure' | 'learn' | 'reset'
}) {
  return (
    <MotionPage className="page auth-page">
      <SiteHeader />
      <section className="auth-shell">
        <AnimatedAuthPanel
          accent={accent}
          label={panelLabel}
          lines={panelLines}
          title={panelTitle}
        />
        <motion.div
          className="auth-card"
          initial={{ opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="eyebrow">
            <ShieldCheck size={15} />
            Truy cập tài khoản
          </span>
          <h2>{title}</h2>
          <p>{subtitle}</p>
          {children}
        </motion.div>
      </section>
    </MotionPage>
  )
}

export function FieldIcon({ type }: { type: 'email' | 'password' | 'user' | 'token' }) {
  const Icon = {
    email: Mail,
    password: LockKeyhole,
    user: UserRound,
    token: ShieldCheck,
  }[type]

  return (
    <span className="field-icon">
      <Icon size={18} />
    </span>
  )
}

export function RoleOption({
  active,
  label,
  description,
  Icon,
  onClick,
}: {
  active: boolean
  label: string
  description: string
  Icon: LucideIcon
  onClick: () => void
}) {
  return (
    <motion.button
      className={`role-option ${active ? 'active' : ''}`}
      onClick={onClick}
      type="button"
      aria-pressed={active}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      layout
    >
      <span className="role-icon">
        <Icon size={22} />
      </span>
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      {active && (
        <motion.span
          className="role-check"
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
        >
          <Check size={15} />
        </motion.span>
      )}
    </motion.button>
  )
}

export function OtpPreview({ value }: { value: string }) {
  const digits = value.padEnd(6, ' ').slice(0, 6).split('')

  return (
    <div className="otp-preview" aria-hidden="true">
      {digits.map((digit, index) => (
        <span className={digit.trim() ? 'filled' : ''} key={`${index}-${digit}`}>
          {digit.trim() ? digit : ''}
        </span>
      ))}
    </div>
  )
}

function AnimatedAuthPanel({
  accent,
  label,
  title,
  lines,
}: {
  accent: 'secure' | 'learn' | 'reset'
  label: string
  title: string
  lines: string[]
}) {
  const reduceMotion = useReducedMotion()
  const primaryLine = lines[0]
  const supportingLines = lines.slice(1)

  return (
    <motion.div
      className={`auth-brand-panel ${accent}`}
      initial={{ opacity: 0, x: -26 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="auth-panel-copy">
        <StudyIllustration />
      </div>
      <div className="auth-visual-stack">
        <motion.div
          className="auth-floating-card main"
          animate={reduceMotion ? undefined : { y: [0, -10, 0] }}
          transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <BookOpen size={24} />
          <span>{label}</span>
          <strong>{title}</strong>
        </motion.div>
        <motion.div
          className="auth-floating-card side"
          animate={reduceMotion ? undefined : { y: [0, 12, 0] }}
          transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ShieldCheck size={22} />
          <span>{primaryLine}</span>
        </motion.div>
      </div>
      <div className="mini-grid">
        {learningTracks.slice(0, 6).map(({ label, Icon, tone }) => (
          <span className={tone} key={label}>
            <Icon size={20} />
          </span>
        ))}
      </div>
      <div className="auth-panel-badges">
        {supportingLines.map((line, index) => {
          const Icon = index % 2 === 0 ? Sparkles : UsersRound

          return (
            <span key={line}>
              <Icon size={15} />
              {line}
            </span>
          )
        })}
      </div>
    </motion.div>
  )
}

function StudyIllustration() {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      className="study-illustration"
      aria-label="Minh họa cộng đồng học tập"
      animate={reduceMotion ? undefined : { y: [0, -8, 0] }}
      transition={{ duration: 4.6, repeat: Infinity, ease: 'easeInOut' }}
    >
      <img src={panelLearning} alt="" aria-hidden="true" />
      <motion.span
        className="study-spark spark-one"
        animate={reduceMotion ? undefined : { scale: [1, 1.2, 1], rotate: [0, 8, 0] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Sparkles size={18} />
      </motion.span>
      <motion.span
        className="study-spark spark-two"
        animate={reduceMotion ? undefined : { scale: [1, 1.15, 1], y: [0, -5, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <GraduationCap size={18} />
      </motion.span>
    </motion.div>
  )
}
