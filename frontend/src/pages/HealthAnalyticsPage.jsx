import { useState } from 'react'
import Layout from '../components/common/Layout'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler)

const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul']

const chartOpts = (title) => ({
  responsive: true,
  plugins: { legend: { position: 'top' }, title: { display: true, text: title } },
  scales: { y: { beginAtZero: false } }
})

export default function HealthAnalyticsPage() {
  const [vitals, setVitals] = useState({
    bp_sys: '', bp_dia: '', heart_rate: '', blood_sugar: '', weight: '', oxygen: ''
  })
  const [saved, setSaved] = useState(false)

  const bpData = {
    labels,
    datasets: [
      { label: 'Systolic (mmHg)', data: [125, 122, 128, 120, 118, 123, 119], borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.08)', tension: 0.4, fill: true },
      { label: 'Diastolic (mmHg)', data: [82, 80, 85, 78, 76, 80, 77], borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.08)', tension: 0.4, fill: true },
    ]
  }

  const heartData = {
    labels,
    datasets: [{
      label: 'Heart Rate (bpm)', data: [72, 75, 70, 68, 73, 71, 69],
      borderColor: '#1a56db', backgroundColor: 'rgba(26,86,219,0.1)', tension: 0.4, fill: true
    }]
  }

  const sugarData = {
    labels,
    datasets: [{
      label: 'Blood Sugar (mg/dL)', data: [95, 102, 98, 100, 94, 97, 96],
      backgroundColor: ['#1a56db','#06b6d4','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899']
    }]
  }

  const healthDonut = {
    labels: ['Excellent', 'Good', 'Needs Attention'],
    datasets: [{
      data: [45, 35, 20],
      backgroundColor: ['#10b981', '#1a56db', '#f59e0b'],
      borderWidth: 0
    }]
  }

  const saveVitals = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <Layout title="Health Analytics">
      {/* Input Vitals */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header"><h3 className="card-title">📝 Log Today's Vitals</h3></div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            {[
              { key: 'bp_sys', label: 'BP Systolic', placeholder: '120 mmHg' },
              { key: 'bp_dia', label: 'BP Diastolic', placeholder: '80 mmHg' },
              { key: 'heart_rate', label: 'Heart Rate', placeholder: '72 bpm' },
              { key: 'blood_sugar', label: 'Blood Sugar', placeholder: '95 mg/dL' },
              { key: 'weight', label: 'Weight', placeholder: '70 kg' },
              { key: 'oxygen', label: 'O₂ Saturation', placeholder: '98%' },
            ].map(f => (
              <div key={f.key} className="form-group" style={{ margin: 0 }}>
                <label className="form-label">{f.label}</label>
                <input className="form-control" type="number" placeholder={f.placeholder}
                  value={vitals[f.key]} onChange={e => setVitals(v => ({...v, [f.key]: e.target.value}))} />
              </div>
            ))}
          </div>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={saveVitals}>
            {saved ? '✅ Saved!' : '💾 Save Vitals'}
          </button>
        </div>
      </div>

      {/* Current Stats */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {[
          { icon: '❤️', label: 'Heart Rate', value: '71 bpm', cls: 'red', normal: true },
          { icon: '🩺', label: 'Blood Pressure', value: '119/77', cls: 'orange', normal: true },
          { icon: '🩸', label: 'Blood Sugar', value: '96 mg/dL', cls: 'blue', normal: true },
          { icon: '💨', label: 'O₂ Saturation', value: '98%', cls: 'green', normal: true },
        ].map(s => (
          <div className="stat-card" key={s.label}>
            <div className={`stat-icon ${s.cls}`}>{s.icon}</div>
            <div>
              <div className="stat-value" style={{ fontSize: '1.3rem' }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
              <span className="badge badge-success" style={{ marginTop: 4, fontSize: '0.7rem' }}>Normal</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid-2" style={{ gap: 20, marginBottom: 20 }}>
        <div className="card">
          <div className="card-body">
            <Line data={bpData} options={chartOpts('Blood Pressure Trend')} />
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <Line data={heartData} options={chartOpts('Heart Rate Trend')} />
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <Bar data={sugarData} options={{ ...chartOpts('Blood Sugar Levels'), scales: { y: { beginAtZero: true } } }} />
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <Doughnut data={healthDonut} options={{ responsive: true, plugins: { legend: { position: 'bottom' }, title: { display: true, text: 'Overall Health Distribution' } } }} />
          </div>
        </div>
      </div>
    </Layout>
  )
}
