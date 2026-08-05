import { SKILL_LABELS, type Skill } from '@/lib/course/outline';

const SKILL_COLOR: Record<Skill, string> = {
  vocabulary: 'var(--skill-vocabulary)',
  grammar: 'var(--skill-grammar)',
  reading: 'var(--skill-reading)',
  listening: 'var(--skill-listening)',
};

interface SkillProgressRowProps {
  skill: Skill;
  /** 0–1；null 表示尚無紀錄 */
  value: number | null;
  valueText?: string;
}

export function SkillProgressRow({ skill, value, valueText }: SkillProgressRowProps) {
  const ratio = value === null ? 0 : Math.min(Math.max(value, 0), 1);
  const percent = Math.round(ratio * 100);
  const display = valueText ?? (value === null ? '—' : `${percent}%`);

  return (
    <div className="skillrow">
      <div className="skillrow__head">
        <span className="skillrow__name" lang="ja">
          {SKILL_LABELS[skill]}
        </span>
        <span className="skillrow__value">{display}</span>
      </div>
      <div
        className="skillrow__track"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${SKILL_LABELS[skill]} 完成度`}
      >
        <div
          className="skillrow__fill"
          style={{ width: `${percent}%`, background: SKILL_COLOR[skill] }}
        />
      </div>
    </div>
  );
}
