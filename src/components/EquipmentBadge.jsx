export default function EquipmentBadge({ icon, label, value, expiry }) {
  const isExpired = new Date(expiry) < new Date()
  const isNearExpiry = !isExpired && (new Date(expiry) - new Date()) / (1000 * 60 * 60 * 24) < 90

  return (
    <div className="equipment-badge">
      <i className={`fa-solid ${icon}`} style={{ color: isExpired ? '#ef4444' : isNearExpiry ? '#f59e0b' : '#3b82f6' }}></i>
      <span>{label}: <strong>{value}</strong></span>
      {(isExpired || isNearExpiry) && (
        <i className="fa-solid fa-triangle-exclamation" style={{ color: isExpired ? '#ef4444' : '#f59e0b', fontSize: 11 }}></i>
      )}
    </div>
  )
}
