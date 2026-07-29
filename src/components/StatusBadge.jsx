export default function StatusBadge({ status }) {
  return (
    <span className={`status-badge ${status}`}>
      <span className="dot"></span>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}
