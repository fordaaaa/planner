interface ConsentBannerProps {
  onSessionOnly: () => void;
  onRemember: () => void;
}

export default function ConsentBanner({ onSessionOnly, onRemember }: ConsentBannerProps) {
  return (
    <div className="consent-banner" role="dialog" aria-label="Browser storage choice">
      <p>
        <strong>Keep this plan just for this visit?</strong> Nothing ever leaves your browser either way —
        “Remember” only saves the canvas in this browser&rsquo;s local storage so it&rsquo;s here next time.
      </p>
      <div className="consent-actions">
        <button onClick={onSessionOnly}>Just this session</button>
        <button className="primary" onClick={onRemember}>
          Remember in this browser
        </button>
      </div>
    </div>
  );
}
