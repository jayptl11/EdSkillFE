import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  Camera,
  FolderOpen,
  GraduationCap,
  Lightbulb,
  Mic2,
  Music2,
  PenTool,
  Rocket,
  Route,
  Search,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { motion, useReducedMotion, type Variants } from 'motion/react'
import { SkillAutocomplete } from '../features/skills/SkillAutocomplete'
import personalOne from '../assets/landing-personal-1.jpg'
import personalTwo from '../assets/landing-personal-2.jpg'
import personalThree from '../assets/landing-personal-3.jpg'

/* ── Types ────────────────────────────────────────────────── */
interface SkillCard {
  title: string
  tag: string
  copy: string
  Icon: LucideIcon
  tone: 'gold' | 'blue' | 'sky'
}

interface FeatureCard {
  title: string
  copy: string
  Icon: LucideIcon
  tone: 'gold' | 'blue' | 'sky' | 'violet'
}

/* ── Data ─────────────────────────────────────────────────── */
const popularSkills = [
  'Tiếng Anh giao tiếp',
  'Toán',
  'Excel',
  'Lập trình React',
  'IELTS Speaking',
  'Thiết kế Canva',
  'Guitar cơ bản',
  'Kỹ năng thuyết trình',
]

const trustStats = [
  { value: '1000+', label: 'kỹ năng có thể bắt đầu ngay' },
  { value: '1:1', label: 'học theo mục tiêu cá nhân' },
  { value: '2 bước', label: 'để bắt đầu dạy trên EdSkill' },
]

const skillCards: SkillCard[] = [
  {
    title: 'Guitar cơ bản',
    tag: 'Sở thích',
    copy: 'Rèn tiết tấu, cảm âm và khả năng biểu đạt qua lộ trình trực quan.',
    Icon: Music2,
    tone: 'gold',
  },
  {
    title: 'Thiết kế tư duy học tập',
    tag: 'Học thuật',
    copy: 'Xây nền tảng tự học, ghi nhớ và hệ thống hóa kiến thức rõ ràng.',
    Icon: Lightbulb,
    tone: 'blue',
  },
  {
    title: 'Excel ứng dụng',
    tag: 'Bổ trợ công việc',
    copy: 'Xử lý dữ liệu, báo cáo và các tình huống văn phòng thực tế.',
    Icon: BarChart3,
    tone: 'sky',
  },
  {
    title: 'Viết học thuật',
    tag: 'Học thuật',
    copy: 'Phát triển lập luận, cấu trúc bài viết và cách trình bày mạch lạc.',
    Icon: PenTool,
    tone: 'blue',
  },
  {
    title: 'Thuyết trình tự tin',
    tag: 'Bổ trợ công việc',
    copy: 'Rèn giọng nói, ngôn ngữ cơ thể và kỹ thuật kể chuyện chuyên nghiệp.',
    Icon: Mic2,
    tone: 'sky',
  },
  {
    title: 'Nhiếp ảnh đời sống',
    tag: 'Sở thích',
    copy: 'Khơi mở quan sát, bố cục và kể chuyện bằng hình ảnh.',
    Icon: Camera,
    tone: 'gold',
  },
]

const modelCards: FeatureCard[] = [
  {
    title: 'Học qua dự án ngắn hạn',
    copy: 'Người học đi từ vấn đề thực tế đến sản phẩm đầu ra rõ ràng.',
    Icon: FolderOpen,
    tone: 'gold',
  },
  {
    title: 'Lộ trình cá nhân hóa',
    copy: 'Chia theo năng lực đầu vào, mục tiêu và nhịp học của từng người.',
    Icon: Route,
    tone: 'blue',
  },
  {
    title: 'Đánh giá bằng ứng dụng',
    copy: 'Kết quả được nhìn qua khả năng vận dụng trong bối cảnh thật.',
    Icon: Award,
    tone: 'sky',
  },
]

const enterpriseCards: FeatureCard[] = [
  {
    title: 'Workshop kỹ năng nội bộ',
    copy: 'Tập trung vào giao tiếp, phối hợp và khả năng tự học cho đội ngũ trẻ.',
    Icon: Users,
    tone: 'blue',
  },
  {
    title: 'Upskill theo phòng ban',
    copy: 'Xây bộ kỹ năng sát nhu cầu từng bộ phận và mục tiêu vận hành.',
    Icon: TrendingUp,
    tone: 'gold',
  },
  {
    title: 'Phát triển nhân tài mới',
    copy: 'Tăng tốc khả năng thích nghi cho thực tập sinh, nhân sự mới và đội ngũ kế cận.',
    Icon: Rocket,
    tone: 'violet',
  },
]

const testimonials = [
  {
    name: 'Trần Hoàng',
    skill: 'Ca hát',
    copy: 'Mình tự tin hơn khi trình diễn và biết cách luyện tập theo từng mục tiêu nhỏ.',
    image: personalThree,
  },
  {
    name: 'Quang Huy',
    skill: 'Kỹ năng bền bỉ',
    copy: 'Các buổi thực hành giúp mình giữ nhịp học đều và chủ động hơn với mục tiêu cá nhân.',
    image: personalOne,
  },
  {
    name: 'Mai Phương',
    skill: 'Viết học thuật',
    copy: 'Cách góp ý chi tiết giúp mình hiểu rõ hơn về lập luận và cấu trúc bài viết.',
    image: personalTwo,
  },
]

const topUniPromo = {
  href: 'https://topuni.hocmai.vn/luyenthidaihoc?utm_campaign=P_Topuni.All_QC1_Coccoc_search.cpa.CCAds_Others.TopUni.2k7_All.VN.18-54_Thongbao.Text&utm_medium=QC1&utm_source=coccoc_context&utm_term=dgnl%20empire&utm_content=44678587&ctm_event_id=2556935444',
  title: 'Luyện thi đại học cùng TopUni by HOCMAI',
  copy:
    'Khám phá lộ trình ôn thi, luyện thi DGNL và bộ tài nguyên học tập dành cho học sinh đang tăng tốc vào đại học.',
  highlights: ['Luyện thi đại học', 'DGNL', 'HOCMAI'],
}

/* ── Shared animation variants ────────────────────────────── */
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
}

const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
}

const cardVariant: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
}

/* ══════════════════════════════════════════════════════════ */
/*  Main export                                               */
/* ══════════════════════════════════════════════════════════ */
export function LearningHero({ isSignedIn }: { isSignedIn: boolean }) {
  const registerHref = isSignedIn ? '/dashboard' : '/register'
  const discoverHref = isSignedIn ? '/dashboard/companions' : '/register'
  const secondaryHref = isSignedIn ? '/teach' : '/login'

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="landing-hero superprof-hero">
        <div className="landing-hero-copy">
          <span className="eyebrow">
            <Sparkles size={15} />
            Tìm người dạy nhanh, bắt đầu dễ
          </span>
          <h1>Tìm người dạy phù hợp cho kỹ năng bạn muốn phát triển.</h1>
          <p>
            EdSkill giúp bạn bắt đầu từ đúng kỹ năng, đúng mục tiêu và đúng nhịp học, đồng thời
            quản lý cả hành trình học lẫn dạy trong cùng một tài khoản.
          </p>

          {isSignedIn ? (
            <LandingSkillSearch />
          ) : (
            <>
              <div className="landing-search-shell">
                <div className="landing-search-bar">
                  <Search size={18} />
                  <span>Ví dụ: IELTS speaking, Excel, React cơ bản, Guitar đệm hát</span>
                </div>
                <Link className="button primary" to={discoverHref}>
                  Đăng ký để bắt đầu
                  <ArrowRight size={18} />
                </Link>
              </div>

              <div className="hero-skill-chips">
                {popularSkills.map((skill) => (
                  <Link className="hero-skill-chip" key={skill} to="/register">
                    {skill}
                  </Link>
                ))}
              </div>
            </>
          )}

          <div className="hero-actions">
            <Link className="button primary" to={registerHref}>
              {isSignedIn ? 'Trang của tôi' : 'Đăng ký'}
            </Link>
            <Link className="button secondary" to={secondaryHref}>
              {isSignedIn ? 'Dạy học' : 'Đăng nhập'}
            </Link>
          </div>
        </div>

        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="landing-hero-media superprof-hero-card"
          initial={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <img
            className="superprof-hero-image"
            src="/hero-1.jpg"
            alt="Người học đang trao đổi trực tiếp cùng người dạy trên EdSkill"
          />
          <div className="superprof-hero-overlay">
            <div>
              <span className="eyebrow">Được tìm nhiều</span>
              <strong>Tiếng Anh giao tiếp</strong>
              <p>Học online hoặc gặp trực tiếp theo mục tiêu của bạn.</p>
            </div>
            <div className="superprof-rating">
              <Star size={16} />
              <span>Hồ sơ rõ ràng, lịch học dễ theo dõi</span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Stat strip ───────────────────────────────────── */}
      <section className="landing-section landing-stat-strip">
        <div className="landing-stat-grid">
          {trustStats.map((item) => (
            <article className="landing-stat-card" key={item.label}>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </article>
          ))}
        </div>
      </section>

      {/* ── Section 1: Nhóm kỹ năng nổi bật ─────────────── */}
      <SkillsBento />

      {/* ── Section 2: Mô hình học đổi mới ──────────────── */}
      <ModelSection />

      {/* ── Section 3: Giải pháp cho doanh nghiệp ────────── */}
      <EnterpriseSection />

      {/* ── Testimonials ─────────────────────────────────── */}
      <section className="landing-section">
        <SectionHeading
          eyebrow="Bạn đồng hành"
          title="Phản hồi từ người học và cộng đồng đã đồng hành cùng EdSkill."
          copy="Các câu chuyện tập trung vào trải nghiệm học, khả năng ứng dụng và sự tự tin sau quá trình luyện tập."
        />
        <div className="landing-card-grid testimonial-grid">
          {testimonials.map(({ name, skill, copy, image }) => (
            <article className="landing-testimonial-card" key={name}>
              <img src={image} alt={`${name} trong cộng đồng EdSkill`} />
              <div>
                <span>{name}</span>
                <h3>{skill}</h3>
                <p>{copy}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── Overview ─────────────────────────────────────── */}
      <section className="landing-section landing-overview" id="overview">
        <SectionHeading
          eyebrow="Tổng quan EdSkill"
          title="Một hệ sinh thái học tập giúp người học phát triển toàn diện và có giá trị cho xã hội."
        />
        <div className="landing-overview-grid">
          <OverviewCard
            Icon={Target}
            title="Mission"
            copy="Giúp người học tiếp cận kỹ năng theo cách hiện đại, ứng dụng được và tạo ra thay đổi tích cực."
          />
          <OverviewCard
            Icon={BookOpen}
            title="Vision"
            copy="Trở thành hệ sinh thái học kỹ năng đáng tin cậy cho nhiều nhóm mục tiêu phát triển."
          />
          <OverviewCard
            Icon={GraduationCap}
            title="Giá trị cốt lõi"
            copy="Thực tế, nhân bản, đổi mới và tạo tác động xã hội thông qua giáo dục kỹ năng."
          />
        </div>
        <div className="landing-final-actions">
          <Link className="button primary" to={isSignedIn ? '/dashboard' : '/register'}>
            Bắt đầu với EdSkill
            <ArrowRight size={18} />
          </Link>
          <Link className="button secondary" to="/login">
            Đăng nhập
          </Link>
        </div>
      </section>

      {/* ── TopUni Promo ─────────────────────────────────── */}
      <section className="landing-section landing-topuni-promo" id="topuni-promo">
        <span className="eyebrow">
          <Sparkles size={15} />
          Đối tác phát triển
        </span>
        <div className="landing-topuni-promo-card">
          <div className="landing-topuni-promo-copy">
            <h2>{topUniPromo.title}</h2>
            <p>{topUniPromo.copy}</p>
            <div className="hero-promo-meta">
              {topUniPromo.highlights.map((highlight) => (
                <span key={highlight}>{highlight}</span>
              ))}
            </div>
            <motion.a
              className="button primary landing-topuni-promo-link"
              href={topUniPromo.href}
              rel="noreferrer"
              target="_blank"
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.98 }}
            >
              Xem trang TopUni
              <ArrowRight size={18} />
            </motion.a>
          </div>
          <a
            className="landing-topuni-promo-banner"
            href={topUniPromo.href}
            rel="noreferrer"
            target="_blank"
          >
            <img src="/QC.png" alt="Banner quảng cáo TopUni 2027" />
          </a>
        </div>
      </section>
    </>
  )
}

/* ══════════════════════════════════════════════════════════ */
/*  Section 1 – Bento Spotlight Grid                         */
/* ══════════════════════════════════════════════════════════ */
function SkillsBento() {
  const [hovered, setHovered] = useState<number | null>(null)
  const reduceMotion = useReducedMotion()

  const glowMap: Record<string, string> = {
    gold: 'rgba(245,185,36,0.35)',
    blue: 'rgba(30,136,229,0.3)',
    sky: 'rgba(16,185,129,0.28)',
  }

  const borderMap: Record<string, string> = {
    gold: 'rgba(245,185,36,0.4)',
    blue: 'rgba(30,136,229,0.35)',
    sky: 'rgba(16,185,129,0.32)',
  }

  return (
    <section className="landing-section landing-skills" id="skills">
      <SectionHeading
        eyebrow="Nhóm kỹ năng nổi bật"
        title="Kỹ năng được chia thành 3 nhóm phù hợp cho nhiều mục tiêu phát triển."
        copy="Từ sở thích cá nhân, năng lực học thuật đến kỹ năng hỗ trợ công việc, EdSkill giúp người học bắt đầu dễ dàng và tiến bộ bền vững."
      />

      <motion.div
        className="skills-bento"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        variants={staggerContainer}
        onMouseLeave={() => setHovered(null)}
      >
        {skillCards.map(({ title, tag, copy, Icon, tone }, i) => (
          <motion.article
            key={title}
            className={`skills-bento__card skills-bento__card--${tone}`}
            variants={cardVariant}
            onMouseEnter={() => setHovered(i)}
            animate={
              reduceMotion
                ? {}
                : {
                    opacity: hovered !== null && hovered !== i ? 0.45 : 1,
                    scale: hovered === i ? 1.02 : 1,
                    boxShadow:
                      hovered === i
                        ? `0 16px 48px ${glowMap[tone]}, 0 0 0 1.5px ${borderMap[tone]}`
                        : '0 2px 12px rgba(0,45,114,0.07)',
                  }
            }
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <div className="bento-card__header">
              <span className={`landing-skill-icon ${tone}`}>
                <Icon size={18} />
              </span>
              <span className="landing-tag">{tag}</span>
            </div>
            <h3 className="bento-card__title">{title}</h3>
            <p className="bento-card__copy">{copy}</p>
          </motion.article>
        ))}
      </motion.div>
    </section>
  )
}


/* ══════════════════════════════════════════════════════════ */
/*  Section 2 – Mô hình học đổi mới                          */
/*  Horizontal Step Flow + Background Immersion              */
/* ══════════════════════════════════════════════════════════ */
function ModelSection() {
  const glowMap: Record<string, string> = {
    gold: 'rgba(245,185,36,0.5)',
    blue: 'rgba(30,136,229,0.45)',
    sky: 'rgba(16,185,129,0.42)',
  }

  return (
    <section className="model-section" id="model">
      {/* Content */}
      <div className="model-section__inner">
        <motion.div
          className="landing-section-heading model-section__heading"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeUp}
        >
          <span className="eyebrow">
            <Sparkles size={15} />
            Mô hình học đổi mới
          </span>
          <h2>Nội dung thực tế, lộ trình linh hoạt và đầu ra rõ ràng.</h2>
          <p>
            Các bài học được thiết kế để người học hiểu nhanh, thực hành sớm và nhìn thấy tiến bộ
            sau từng chặng.
          </p>
        </motion.div>

        {/* Step flow */}
        <div className="model-step-flow">
          {modelCards.map((card, i) => (
            <div key={card.title} className="model-step-flow__item">
              {/* Step card */}
              <motion.article
                className={`model-step-card model-step-card--${card.tone}`}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{
                  scale: 1.04,
                  boxShadow: `0 20px 56px ${glowMap[card.tone]}`,
                }}
              >
                {/* Step number */}
                <div className="model-step-card__num">0{i + 1}</div>

                {/* Icon bubble */}
                <span className={`info-card-icon-bubble ${card.tone} model-step-card__icon`}>
                  <card.Icon size={22} />
                </span>

                <h3>{card.title}</h3>
                <p>{card.copy}</p>
              </motion.article>

              {/* Connector arrow (between cards) */}
              {i < modelCards.length - 1 && (
                <div className="model-connector" aria-hidden="true">
                  <div className="model-connector__line" />
                  <div className="model-connector__dot" />
                  <ArrowRight size={16} className="model-connector__arrow" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ══════════════════════════════════════════════════════════ */
/*  Section 3 – Giải pháp cho doanh nghiệp                   */
/*  Enterprise Dark Panel                                    */
/* ══════════════════════════════════════════════════════════ */
function EnterpriseSection() {
  return (
    <motion.section
      className="enterprise-section"
      id="enterprise"
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="enterprise-grid">
        {/* ── Left: copy + solution cards ──────────────── */}
        <div className="enterprise-copy">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="eyebrow">
              <Sparkles size={15} />
              Giải pháp cho doanh nghiệp
            </span>
            <h2 className="enterprise-copy__heading">
              Đồng hành với doanh nghiệp phát triển đội ngũ bằng kỹ năng thực chiến.
            </h2>
            <p className="enterprise-copy__sub">
              EdSkill hỗ trợ chương trình đào tạo theo nhu cầu cụ thể, ưu tiên khả năng ứng dụng
              và đo lường.
            </p>
          </motion.div>

          {/* Solution cards */}
          <div className="enterprise-solutions">
            {enterpriseCards.map((card, i) => (
              <motion.article
                key={card.title}
                className="enterprise-solution-card"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.4, delay: 0.15 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ x: 5 }}
              >
                <span className={`info-card-icon-bubble ${card.tone} enterprise-solution-card__icon`}>
                  <card.Icon size={20} />
                </span>
                <div>
                  <h3>{card.title}</h3>
                  <p>{card.copy}</p>
                </div>
              </motion.article>
            ))}
          </div>
        </div>

        {/* ── Right: visual panel ──────────────────────── */}
        <motion.div
          className="enterprise-visual"
          initial={{ opacity: 0, scale: 0.94 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Metric chips */}
          <div className="enterprise-metrics">
            {trustStats.slice(0, 2).map((stat) => (
              <div key={stat.label} className="enterprise-metric-chip">
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>

          {/* Image */}
          <div className="enterprise-image-wrap">
            <img src="/hero-3.jpg" alt="Hoạt động trải nghiệm và phát triển kỹ năng" />
            <div className="enterprise-image-glow" aria-hidden="true" />
          </div>
        </motion.div>
      </div>
    </motion.section>
  )
}

/* ══════════════════════════════════════════════════════════ */
/*  Shared sub-components                                    */
/* ══════════════════════════════════════════════════════════ */
function SectionHeading({
  eyebrow,
  title,
  copy,
}: {
  eyebrow: string
  title: string
  copy?: string
}) {
  return (
    <motion.div
      className="landing-section-heading"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      variants={fadeUp}
    >
      <span className="eyebrow">
        <Sparkles size={15} />
        {eyebrow}
      </span>
      <h2>{title}</h2>
      {copy && <p>{copy}</p>}
    </motion.div>
  )
}

function OverviewCard({
  Icon,
  title,
  copy,
}: {
  Icon: LucideIcon
  title: string
  copy: string
}) {
  return (
    <article className="landing-overview-card">
      <span>
        <Icon size={24} />
      </span>
      <h3>{title}</h3>
      <p>{copy}</p>
    </article>
  )
}

/* ══════════════════════════════════════════════════════════ */
/*  Landing Skill Search (signed-in only)                    */
/* ══════════════════════════════════════════════════════════ */
function LandingSkillSearch() {
  const navigate = useNavigate()
  const [selectedSkill, setSelectedSkill] = useState('')

  const handleSelectWithId = (id: string, name: string) => {
    setSelectedSkill(name)
    navigate(`/dashboard/companions?skillId=${encodeURIComponent(id)}&skillName=${encodeURIComponent(name)}`)
  }

  return (
    <>
      <div className="landing-search-shell landing-search-live">
        <SkillAutocomplete
          helperText=""
          label=""
          mode="single"
          onRemove={() => setSelectedSkill('')}
          onSelect={(name) => setSelectedSkill(name)}
          onSelectWithId={handleSelectWithId}
          placeholder="Tìm kỹ năng: IELTS, Excel, Guitar..."
          selectedSkills={selectedSkill ? [selectedSkill] : []}
        />
        <Link className="button primary" to="/dashboard/companions">
          Tìm buổi học
          <ArrowRight size={18} />
        </Link>
      </div>

      <div className="hero-skill-chips">
        {popularSkills.map((skill) => (
          <Link
            className="hero-skill-chip"
            key={skill}
            to={`/dashboard/companions?skillName=${encodeURIComponent(skill)}`}
          >
            {skill}
          </Link>
        ))}
      </div>
    </>
  )
}
