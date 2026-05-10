import { Link } from 'react-router-dom'
import Tilt from 'react-parallax-tilt'
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Camera,
  CheckCircle2,
  GraduationCap,
  Lightbulb,
  Mic2,
  Music2,
  PenTool,
  Sparkles,
  Target,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import landingLogo from '../assets/landing-logo-source.jpg'
import personalOne from '../assets/landing-personal-1.jpg'
import personalTwo from '../assets/landing-personal-2.jpg'
import personalThree from '../assets/landing-personal-3.jpg'

interface SkillCard {
  title: string
  tag: string
  copy: string
  Icon: LucideIcon
  tone: 'gold' | 'blue' | 'sky'
}

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

const modelCards = [
  {
    title: 'Học qua dự án ngắn hạn',
    copy: 'Learner đi từ vấn đề thực tế đến sản phẩm đầu ra rõ ràng.',
  },
  {
    title: 'Lộ trình cá nhân hóa',
    copy: 'Chia theo năng lực đầu vào, mục tiêu và nhịp học của từng người.',
  },
  {
    title: 'Đánh giá bằng ứng dụng',
    copy: 'Kết quả được nhìn qua khả năng vận dụng trong bối cảnh thật.',
  },
]

const enterpriseCards = [
  {
    title: 'Workshop kỹ năng nội bộ',
    copy: 'Tập trung vào giao tiếp, phối hợp và khả năng tự học cho đội ngũ trẻ.',
  },
  {
    title: 'Upskill theo phòng ban',
    copy: 'Xây bộ kỹ năng sát nhu cầu từng bộ phận và mục tiêu vận hành.',
  },
  {
    title: 'Phát triển nhân tài mới',
    copy: 'Tăng tốc khả năng thích nghi cho thực tập sinh, nhân sự mới và đội ngũ kế cận.',
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

export function LearningHero({ isSignedIn }: { isSignedIn: boolean }) {
  const reduceMotion = useReducedMotion()

  return (
    <>
      <section className="landing-hero" id="home">
        <motion.div
          className="landing-hero-copy"
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="eyebrow">
            <Sparkles size={15} />
            Nền tảng học kỹ năng toàn diện
          </span>
          <img className="landing-hero-logo" src={landingLogo} alt="EdSkill" />
          <h1>Học kỹ năng theo cách hiện đại, thực tế và truyền cảm hứng.</h1>
          <p>
            EdSkill kết nối kỹ năng sở thích, học thuật và bổ trợ công việc trong một
            hệ sinh thái học tập có lộ trình, thực hành và Companion.
          </p>
          <div className="hero-actions">
            <motion.div whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }}>
              <Link className="button primary" to={isSignedIn ? '/dashboard' : '/register'}>
                Đăng ký ngay
                <ArrowRight size={18} />
              </Link>
            </motion.div>
            <motion.div whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }}>
              <a className="button secondary" href="#skills">
                Khám phá thêm
              </a>
            </motion.div>
          </div>
          <div className="hero-proof">
            <span>
              <CheckCircle2 size={18} />
              Theo vai trò
            </span>
            <span>
              <UsersRound size={18} />
              Học cùng cộng đồng
            </span>
          </div>
        </motion.div>

        <Tilt
          className="landing-hero-media"
          tiltEnable={!reduceMotion}
          tiltMaxAngleX={4}
          tiltMaxAngleY={6}
          perspective={1200}
          scale={1.01}
          transitionSpeed={1400}
          gyroscope={false}
        >
          <motion.div
            className="landing-photo-card"
            initial={{ opacity: 0, scale: 0.96, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.62, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          >
            <img src="/hero-1.jpg" alt="Học viên EdSkill trình diễn và luyện tập kỹ năng" />
          </motion.div>
        </Tilt>
      </section>

      <section className="landing-section landing-skills" id="skills">
        <SectionHeading
          eyebrow="Nhóm kỹ năng nổi bật"
          title="Kỹ năng được chia thành 3 nhóm phù hợp cho nhiều mục tiêu phát triển."
          copy="Từ sở thích cá nhân, năng lực học thuật đến kỹ năng hỗ trợ công việc, EdSkill giúp Learner bắt đầu dễ dàng và tiến bộ bền vững."
        />
        <motion.div
          className="landing-card-grid skills-grid"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={{ visible: { transition: { staggerChildren: 0.055 } } }}
        >
          {skillCards.map(({ title, tag, copy, Icon, tone }) => (
            <motion.article
              className="landing-skill-card"
              key={title}
              variants={{
                hidden: { opacity: 0, y: 18 },
                visible: { opacity: 1, y: 0 },
              }}
              whileHover={reduceMotion ? undefined : { y: -5 }}
            >
              <div className="landing-card-top">
                <span className={`landing-skill-icon ${tone}`}>
                  <Icon size={21} />
                </span>
                <span className="landing-tag">{tag}</span>
              </div>
              <h3>{title}</h3>
              <p>{copy}</p>
            </motion.article>
          ))}
        </motion.div>
      </section>

      <FeatureSection
        eyebrow="Mô hình học đổi mới"
        title="Nội dung thực tế, lộ trình linh hoạt và đầu ra rõ ràng."
        copy="Các bài học được thiết kế để Learner hiểu nhanh, thực hành sớm và nhìn thấy tiến bộ sau từng chặng."
        image="/hero-2.jpg"
        imageAlt="Minh họa cộng đồng học tập EdSkill"
        cards={modelCards}
      />

      <FeatureSection
        eyebrow="Giải pháp cho doanh nghiệp"
        title="Đồng hành với doanh nghiệp phát triển đội ngũ bằng kỹ năng thực chiến."
        copy="EdSkill hỗ trợ chương trình đào tạo theo nhu cầu cụ thể, ưu tiên khả năng ứng dụng và đo lường."
        image="/hero-3.jpg"
        imageAlt="Hoạt động trải nghiệm và phát triển kỹ năng"
        cards={enterpriseCards}
        reverse
      />

      <section className="landing-section">
        <SectionHeading
          eyebrow="Bạn đồng hành"
          title="Phản hồi từ Learner và cộng đồng đã đồng hành cùng EdSkill."
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

      <section className="landing-section landing-overview" id="overview">
        <SectionHeading
          eyebrow="Tổng quan EdSkill"
          title="Một hệ sinh thái học tập giúp Learner phát triển toàn diện và có giá trị cho xã hội."
        />
        <div className="landing-overview-grid">
          <OverviewCard
            Icon={Target}
            title="Mission"
            copy="Giúp Learner tiếp cận kỹ năng theo cách hiện đại, ứng dụng được và tạo ra thay đổi tích cực."
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
    </>
  )
}

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
    <div className="landing-section-heading">
      <span className="eyebrow">
        <Sparkles size={15} />
        {eyebrow}
      </span>
      <h2>{title}</h2>
      {copy && <p>{copy}</p>}
    </div>
  )
}

function FeatureSection({
  eyebrow,
  title,
  copy,
  image,
  imageAlt,
  cards,
  reverse = false,
}: {
  eyebrow: string
  title: string
  copy: string
  image: string
  imageAlt: string
  cards: Array<{ title: string; copy: string }>
  reverse?: boolean
}) {
  return (
    <section className={`landing-section landing-feature ${reverse ? 'reverse' : ''}`}>
      <SectionHeading eyebrow={eyebrow} title={title} copy={copy} />
      <div className="landing-feature-grid">
        <div className="landing-feature-list">
          {cards.map((card, index) => (
            <article className="landing-info-card" key={card.title}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <h3>{card.title}</h3>
              <p>{card.copy}</p>
            </article>
          ))}
        </div>
        <div className="landing-feature-image">
          <img src={image} alt={imageAlt} />
        </div>
      </div>
    </section>
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
