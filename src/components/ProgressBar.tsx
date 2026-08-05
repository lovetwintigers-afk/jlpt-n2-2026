interface ProgressBarProps {
  /** 0–1 */
  value: number;
  label?: string;
  /** 右側顯示的文字，未給則顯示百分比 */
  valueText?: string;
  variant?: 'accent' | 'success';
  size?: 'md' | 'sm';
}

export function ProgressBar({
  value,
  label,
  valueText,
  variant = 'accent',
  size = 'md',
}: ProgressBarProps) {
  const ratio = Math.min(Math.max(value, 0), 1);
  const percent = Math.round(ratio * 100);
  const classes = [
    'progress',
    variant === 'success' ? 'progress--success' : '',
    size === 'sm' ? 'progress--sm' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes}>
      {(label || valueText) && (
        <div className="progress__labels">
          {label && <span className="progress__label">{label}</span>}
          <span className="progress__value">{valueText ?? `${percent}%`}</span>
        </div>
      )}
      <div
        className="progress__track"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? '進度'}
      >
        <div className="progress__fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
