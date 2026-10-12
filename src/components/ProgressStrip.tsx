interface ProgressStripProps {
  done: number;
  total: number;
}

export default function ProgressStrip({ done, total }: ProgressStripProps) {
  if (total === 0) return null;
  const pct = Math.round((done / total) * 100);
  return (
    <div className="progress-strip" aria-label={`${done} of ${total} steps done`}>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="progress-label">
        {done}/{total} done
      </span>
    </div>
  );
}
