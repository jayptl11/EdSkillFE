import { type ReactNode } from 'react'
import {
  BookOpen,
  Check,
  GraduationCap,
  LockKeyhole,
  Mail,
  Search,
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
  contextLabel = 'Truy cập tài khoản',
  steps,
}: {
  title: string
  subtitle: string
  panelLabel: string
  panelTitle: string
  panelLines: string[]
  children: ReactNode
  accent?: 'secure' | 'learn' | 'reset' | 'teach'
  contextLabel?: string
  steps?: Array<{ label: string; active?: boolean; done?: boolean }>
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
          animate={{ opacity: 1, x: 0 }}
          className="auth-card"
          initial={{ opacity: 0, x: 28 }}
          transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="eyebrow">
            <ShieldCheck size={15} />
            {contextLabel}
          </span>
          <h2>{title}</h2>
          <p>{subtitle}</p>
          {steps?.length ? (
            <div className="auth-step-row" aria-label="Tiến trình">
              {steps.map((step) => (
                <span
                  className={`auth-step-chip ${step.active ? 'active' : ''} ${step.done ? 'done' : ''}`.trim()}
                  key={step.label}
                >
                  {step.label}
                </span>
              ))}
            </div>
          ) : null}
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
      aria-pressed={active}
      className={`role-option ${active ? 'active' : ''}`}
      layout
      onClick={onClick}
      type="button"
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
    >
      <span className="role-icon">
        <Icon size={22} />
      </span>
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      {active ? (
        <motion.span
          animate={{ scale: 1, rotate: 0 }}
          className="role-check"
          initial={{ scale: 0, rotate: -90 }}
        >
          <Check size={15} />
        </motion.span>
      ) : null}
    </motion.button>
  )
}

function AnimatedAuthPanel({
  accent,
  label,
  title,
  lines,
}: {
  accent: 'secure' | 'learn' | 'reset' | 'teach'
  label: string
  title: string
  lines: string[]
}) {
  const reduceMotion = useReducedMotion()
  const primaryLine = lines[0]
  const supportingLines = lines.slice(1)
  const AccentIcon =
    accent === 'teach' ? UsersRound : accent === 'learn' ? Search : ShieldCheck

  return (
    <motion.div
      animate={{ opacity: 1, x: 0 }}
      className={`auth-brand-panel ${accent}`}
      initial={{ opacity: 0, x: -26 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="auth-panel-copy">
        <StudyIllustration />
      </div>
      <div className="auth-visual-stack">
        <motion.div
          animate={reduceMotion ? undefined : { y: [0, -10, 0] }}
          className="auth-floating-card main"
          transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <BookOpen size={24} />
          <span>{label}</span>
          <strong>{title}</strong>
        </motion.div>
        <motion.div
          animate={reduceMotion ? undefined : { y: [0, 12, 0] }}
          className="auth-floating-card side"
          transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <AccentIcon size={22} />
          <span>{primaryLine}</span>
        </motion.div>
      </div>
      <div className="mini-grid">
        {learningTracks.slice(0, 6).map(({ label: itemLabel, Icon, tone }) => (
          <span className={tone} key={itemLabel}>
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
      animate={reduceMotion ? undefined : { y: [0, -8, 0] }}
      aria-label="Minh họa cộng đồng học tập"
      className="study-illustration"
      transition={{ duration: 4.6, repeat: Infinity, ease: 'easeInOut' }}
    >
      <img alt="" aria-hidden="true" src={panelLearning} />
      <motion.span
        animate={reduceMotion ? undefined : { scale: [1, 1.2, 1], rotate: [0, 8, 0] }}
        className="study-spark spark-one"
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Sparkles size={18} />
      </motion.span>
      <motion.span
        animate={reduceMotion ? undefined : { scale: [1, 1.15, 1], y: [0, -5, 0] }}
        className="study-spark spark-two"
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <GraduationCap size={18} />
      </motion.span>
    </motion.div>
  )
}
