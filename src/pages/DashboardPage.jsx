import { useState, useEffect } from 'react'
import Chart from 'react-apexcharts'
import DashboardCard from '../components/DashboardCard'
import StatusBadge from '../components/StatusBadge'
import { SkeletonCard } from '../components/Loader'
import dashboardData from '../data/dashboardData.json'
import projects from '../data/projects.json'

export default function DashboardPage() {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const [loading, setLoading] = useState(true)
  const data = dashboardData

  useEffect(() => { setTimeout(() => setLoading(false), 800) }, [])

  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const barOptions = {
    chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'Inter' },
    plotOptions: { bar: { borderRadius: 6, columnWidth: '50%' } },
    colors: ['#3b82f6', '#ef4444'],
    dataLabels: { enabled: false },
    xaxis: { categories: data.monthlyProjectData.map(m => m.month) },
    legend: { position: 'top' },
    grid: { borderColor: '#f1f5f9' },
  }
  const barSeries = [
    { name: 'Active', data: data.monthlyProjectData.map(m => m.active) },
    { name: 'Expired', data: data.monthlyProjectData.map(m => m.expired) },
  ]

  const donutOptions = {
    chart: { type: 'donut', fontFamily: 'Inter' },
    labels: data.statusDistribution.map(s => s.label),
    colors: ['#10b981', '#ef4444', '#f59e0b'],
    legend: { position: 'bottom' },
    dataLabels: { enabled: true },
    plotOptions: { pie: { donut: { size: '65%', labels: { show: true, total: { show: true, label: 'Total', fontSize: '14px', fontWeight: 600 } } } } },
  }
  const donutSeries = data.statusDistribution.map(s => s.value)

  if (loading) return (
    <div className="fade-in">
      <div className="page-header"><div className="skeleton skeleton-title"></div></div>
      <div className="row g-3 mb-4">{[1,2,3,4,5,6].map(i => <div className="col-lg-2 col-md-4 col-6" key={i}><SkeletonCard /></div>)}</div>
    </div>
  )

  return (
    <div className="fade-in">
      <div className="page-header">
        <h4>Dashboard</h4>
        <nav aria-label="breadcrumb"><ol className="breadcrumb"><li className="breadcrumb-item"><a href="#">Home</a></li><li className="breadcrumb-item active">Dashboard</li></ol></nav>
      </div>

      {/* Stat Cards */}
      <div className="row g-3 mb-4">
        <div className="col-xl-2 col-md-4 col-6"><DashboardCard icon="fa-solid fa-folder" value={data.stats.totalProjects} label="Total Projects" variant="primary" /></div>
        <div className="col-xl-2 col-md-4 col-6"><DashboardCard icon="fa-solid fa-circle-check" value={data.stats.activeProjects} label="Active Projects" variant="success" /></div>
        <div className="col-xl-2 col-md-4 col-6"><DashboardCard icon="fa-solid fa-circle-xmark" value={data.stats.expiredProjects} label="Expired Projects" variant="danger" /></div>
        <div className="col-xl-2 col-md-4 col-6"><DashboardCard icon="fa-solid fa-clock-rotate-left" value={data.stats.upcomingRenewals} label="Upcoming Renewals" variant="warning" /></div>
        <div className="col-xl-2 col-md-4 col-6"><DashboardCard icon="fa-solid fa-video" value={data.stats.totalEquipments} label="Total Equipments" variant="info" /></div>
        <div className="col-xl-2 col-md-4 col-6"><DashboardCard icon="fa-solid fa-usb" value={data.stats.totalUSB} label="USB Devices" variant="primary" /></div>
      </div>

      {/* Charts Row */}
      <div className="row g-3 mb-4">
        <div className="col-lg-8">
          <div className="dash-card">
            <div className="card-header-custom">
              <h6><i className="fa-solid fa-chart-column me-2 text-primary"></i>Project Overview</h6>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Last 12 months</span>
            </div>
            <div className="card-body-custom">
              <Chart options={barOptions} series={barSeries} type="bar" height={300} />
            </div>
          </div>
        </div>
        <div className="col-lg-4">
          <div className="dash-card">
            <div className="card-header-custom">
              <h6><i className="fa-solid fa-chart-pie me-2 text-primary"></i>AMC Status</h6>
            </div>
            <div className="card-body-custom">
              <Chart options={donutOptions} series={donutSeries} type="donut" height={300} />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="row g-3 mb-4">
        {/* Recent Projects Table */}
        <div className="col-lg-8">
          <div className="dash-card">
            <div className="card-header-custom">
              <h6><i className="fa-solid fa-list me-2 text-primary"></i>Recent Projects</h6>
              <a href="/projects" className="btn-outline-custom" style={{ padding: '6px 14px', fontSize: 12 }}>View All</a>
            </div>
            <div className="card-body-custom p-0">
              <div className="table-container">
                <table className="modern-table">
                  <thead><tr><th>Project</th><th>Site</th><th>Status</th><th>End Date</th><th>Equipment</th></tr></thead>
                  <tbody>
                    {projects.slice(0, 5).map(p => (
                      <tr key={p.id}>
                        <td><strong style={{ fontSize: 13 }}>{p.projectName}</strong></td>
                        <td>{p.siteName}</td>
                        <td><StatusBadge status={p.status} /></td>
                        <td>{formatDate(p.endDate)}</td>
                        <td><span className="equipment-badge"><i className="fa-solid fa-video"></i>{p.equipment.camera.count} Cameras</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Alerts & Activity */}
        <div className="col-lg-4">
          <div className="dash-card mb-3">
            <div className="card-header-custom">
              <h6><i className="fa-solid fa-triangle-exclamation me-2 text-warning"></i>Expiry Alerts</h6>
            </div>
            <div className="card-body-custom">
              {data.equipmentAlerts.slice(0, 4).map(a => (
                <div className="alert-item" key={a.id}>
                  <div className={`alert-icon ${a.severity}`}><i className="fa-solid fa-triangle-exclamation"></i></div>
                  <div className="alert-text">
                    <h6>{a.item}</h6>
                    <p>{a.project} &middot; {formatDate(a.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="dash-card">
            <div className="card-header-custom">
              <h6><i className="fa-solid fa-timeline me-2 text-primary"></i>Recent Activity</h6>
            </div>
            <div className="card-body-custom">
              <div className="audit-timeline">
                {data.recentActivity.slice(0, 4).map(a => (
                  <div className="timeline-item" key={a.id}>
                    <div className="timeline-dot"></div>
                    <div className="timeline-content">
                      <h6>{a.action}</h6>
                      <p>{a.project}</p>
                      <small>{a.user} &middot; {formatDate(a.date)}</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
