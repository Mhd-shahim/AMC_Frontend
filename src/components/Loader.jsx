export function Loader() {
  return (
    <div className="d-flex justify-content-center align-items-center py-5">
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
    </div>
  )
}

export function SkeletonCard() {
  return <div className="skeleton skeleton-card mb-3"></div>
}

export function SkeletonTable({ rows = 5 }) {
  return (
    <div>
      <div className="skeleton skeleton-title mb-3"></div>
      {[...Array(rows)].map((_, i) => (
        <div className="skeleton skeleton-text" key={i} style={{ width: `${100 - i * 5}%` }}></div>
      ))}
    </div>
  )
}

export function EmptyState({ icon = 'fa-regular fa-folder-open', title = 'No data found', message = 'There are no items to display.' }) {
  return (
    <div className="empty-state">
      <i className={icon}></i>
      <h5>{title}</h5>
      <p>{message}</p>
    </div>
  )
}
