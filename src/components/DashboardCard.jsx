export default function DashboardCard({ icon, value, label, variant = 'primary' }) {
  return (
    <div className={`stat-card ${variant} fade-in`}>
      <div className="stat-icon">
        <i className={icon}></i>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}
