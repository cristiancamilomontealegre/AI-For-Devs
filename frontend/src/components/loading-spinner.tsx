import './loading-spinner.css';

export function LoadingSpinner() {
  return (
    <div className="loading-spinner" role="status" aria-label="Loading">
      <div className="loading-spinner__ring" />
      <span className="loading-spinner__text">Loading products…</span>
    </div>
  );
}
