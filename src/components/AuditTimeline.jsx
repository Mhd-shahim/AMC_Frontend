export default function AuditTimeline({ logs }) {
  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  if (!logs || logs.length === 0) {
    return <div className="empty-state py-4"><i className="fa-regular fa-clock d-block mb-2" style={{ fontSize: 32 }}></i><p>No audit logs available</p></div>
  }

  return (
    <div className="audit-timeline">
      {logs.map((log, idx) => (
        <div className="timeline-item" key={idx}>
          <div className="timeline-dot"></div>
          <div className="timeline-content">
            <h6>{log.action}</h6>
            <p>{log.details}</p>
            <small><i className="fa-regular fa-user me-1"></i>{log.user} &middot; {formatDate(log.date)}</small>
          </div>
        </div>
      ))}
    </div>
  )
}
