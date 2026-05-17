import { Award } from 'lucide-react'
import type { AchievementSummaryDto } from './types'

export function AchievementSection({
  achievements,
  emptyLabel = 'Chưa có thành tích nào.',
  title = 'Thành tích',
  compact = false,
}: {
  achievements: AchievementSummaryDto[]
  emptyLabel?: string
  title?: string
  compact?: boolean
}) {
  return (
    <section className={`achievement-section${compact ? ' compact' : ''}`}>
      <div className="achievement-section-head">
        <h3>{title}</h3>
      </div>

      {achievements.length === 0 ? (
        <p className="achievement-empty-copy">{emptyLabel}</p>
      ) : (
        <div className={`achievement-grid${compact ? ' compact' : ''}`}>
          {achievements.map((achievement) => (
            <article className="achievement-card" key={achievement.achievementId}>
              {achievement.iconUrl ? (
                <img alt={achievement.name} className="achievement-card-icon" src={achievement.iconUrl} />
              ) : (
                <div className="achievement-card-icon achievement-card-icon--placeholder" aria-hidden="true">
                  <Award size={24} />
                </div>
              )}
              <strong>{achievement.name}</strong>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
