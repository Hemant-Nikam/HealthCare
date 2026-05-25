import { useState } from 'react'
import Layout from '../components/common/Layout'
import { groqChat } from '../services/api'
import { toast } from 'react-toastify'

export default function ReportAnalyzerPage() {
  const [mode, setMode] = useState('manual')
  const [manualData, setManualData] = useState('')
  const [file, setFile] = useState(null)
  const [fileText, setFileText] = useState('')
  const [analysis, setAnalysis] = useState('')
  const [loading, setLoading] = useState(false)
  const [reports, setReports] = useState([])

  const analyzeReport = async () => {
    const content = mode === 'manual' ? manualData : fileText
    if (!content.trim()) return toast.error('Please provide report data to analyze')

    setLoading(true)
    setAnalysis('')
    try {
      const prompt = `Analyze this medical report data and provide a clear, structured summary:\n\n${content}\n\nProvide:
1. 📊 Key Findings (bullet points)
2. ⚠️ Values Outside Normal Range (if any)
3. ✅ Normal Values
4. 💡 General Recommendations
5. 🔴 Urgency Level: Low / Medium / High

Note: This is AI analysis for informational purposes only. Always consult your doctor.`

      const result = await groqChat(prompt, 'You are a medical report analyzer AI. Analyze health reports clearly and concisely. Always add a disclaimer to consult a doctor.')
      setAnalysis(result)
      // Save to history
      setReports(prev => [{
        id: Date.now(),
        type: mode === 'manual' ? 'Manual Input' : file?.name || 'File Upload',
        date: new Date().toLocaleDateString(),
        summary: result.substring(0, 100) + '...'
      }, ...prev.slice(0, 4)])
    } catch {
      toast.error('Failed to analyze. Please check your Groq API key.')
    }
    setLoading(false)
  }

  const handleFileUpload = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    const reader = new FileReader()
    reader.onload = (ev) => setFileText(ev.target.result)
    reader.readAsText(f)
    toast.success(`File "${f.name}" loaded`)
  }

  const templates = [
    { label: 'Blood Test', value: 'Hemoglobin: 11.2 g/dL\nWBC: 10,500/μL\nPlatelets: 145,000/μL\nBlood Sugar (fasting): 108 mg/dL\nCholesterol: 215 mg/dL\nHDL: 42 mg/dL\nLDL: 135 mg/dL\nCreatinine: 1.1 mg/dL' },
    { label: 'Lipid Profile', value: 'Total Cholesterol: 220 mg/dL\nTriglycerides: 180 mg/dL\nHDL: 38 mg/dL\nLDL: 148 mg/dL\nVLDL: 36 mg/dL' },
    { label: 'Thyroid', value: 'TSH: 5.8 μIU/mL\nT3 (Total): 95 ng/dL\nT4 (Free): 0.85 ng/dL\nAnti-TPO: 45 IU/mL' },
  ]

  return (
    <Layout title="Report Analyzer">
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 4 }}>🔬 AI Report Analyzer</h2>
          <p className="text-muted text-sm">Upload or type your health report data for AI-powered analysis using Groq AI</p>
        </div>

        <div className="grid-2" style={{ gap: 20 }}>
          {/* Input Panel */}
          <div>
            {/* Mode toggle */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {[{ key: 'manual', label: '✏️ Manual Input' }, { key: 'upload', label: '📁 Upload File' }].map(m => (
                <button key={m.key} className={`btn btn-sm ${mode === m.key ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setMode(m.key)}>{m.label}</button>
              ))}
            </div>

            <div className="card">
              <div className="card-header"><h3 className="card-title">Report Data</h3></div>
              <div className="card-body">
                {mode === 'manual' ? (
                  <>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--grey-500)', alignSelf: 'center' }}>Templates:</span>
                      {templates.map(t => (
                        <button key={t.label} className="btn btn-sm btn-outline" onClick={() => setManualData(t.value)}>
                          {t.label}
                        </button>
                      ))}
                    </div>
                    <textarea className="form-control" style={{ minHeight: 220, fontFamily: 'monospace', fontSize: '0.85rem' }}
                      placeholder="Enter report values, e.g.&#10;Hemoglobin: 12.5 g/dL&#10;Blood Sugar: 105 mg/dL&#10;Cholesterol: 190 mg/dL..."
                      value={manualData} onChange={e => setManualData(e.target.value)} />
                  </>
                ) : (
                  <div>
                    <div style={{ border: '2px dashed var(--grey-300)', borderRadius: 10, padding: '32px 20px', textAlign: 'center', marginBottom: 12, cursor: 'pointer', background: 'var(--grey-50)' }}
                      onClick={() => document.getElementById('fileInput').click()}>
                      <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📁</div>
                      <p style={{ fontWeight: 600 }}>{file ? file.name : 'Click to upload report'}</p>
                      <p className="text-xs text-muted" style={{ marginTop: 4 }}>Supports: .txt, .csv, .json files</p>
                      <input id="fileInput" type="file" accept=".txt,.csv,.json" style={{ display: 'none' }} onChange={handleFileUpload} />
                    </div>
                    {fileText && (
                      <textarea className="form-control" style={{ minHeight: 120, fontFamily: 'monospace', fontSize: '0.82rem' }}
                        value={fileText} onChange={e => setFileText(e.target.value)} />
                    )}
                  </div>
                )}

                <button className="btn btn-primary w-full" style={{ marginTop: 14 }} onClick={analyzeReport} disabled={loading}>
                  {loading ? '🔄 Analyzing with AI...' : '🤖 Analyze Report'}
                </button>
              </div>
            </div>

            {/* History */}
            {reports.length > 0 && (
              <div className="card" style={{ marginTop: 16 }}>
                <div className="card-header"><h3 className="card-title">Recent Analyses</h3></div>
                <div className="card-body" style={{ padding: 0 }}>
                  {reports.map(r => (
                    <div key={r.id} style={{ padding: '12px 20px', borderBottom: '1px solid var(--grey-100)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{r.type}</span>
                        <span className="text-xs text-muted">{r.date}</span>
                      </div>
                      <p style={{ fontSize: '0.78rem', color: 'var(--grey-500)', marginTop: 4 }}>{r.summary}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Analysis Result */}
          <div className="card">
            <div className="card-header"><h3 className="card-title">🤖 AI Analysis</h3></div>
            <div className="card-body">
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 16, color: 'var(--grey-500)' }}>
                  <div style={{ width: 48, height: 48, border: '3px solid var(--primary-light)', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  <p>Analyzing your report with Groq AI...</p>
                </div>
              ) : analysis ? (
                <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.875rem', lineHeight: 1.7, color: 'var(--grey-800)', minHeight: 300 }}>
                  {analysis}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, color: 'var(--grey-400)', gap: 12 }}>
                  <div style={{ fontSize: '3rem' }}>🔬</div>
                  <p style={{ textAlign: 'center' }}>Your AI analysis will appear here.<br/>Enter report data and click Analyze.</p>
                </div>
              )}

              {analysis && (
                <div style={{ marginTop: 16, padding: 12, background: '#fef3c7', borderRadius: 8, border: '1px solid #fde68a' }}>
                  <p style={{ fontSize: '0.78rem', color: '#92400e' }}>
                    ⚠️ This AI analysis is for informational purposes only and is not a medical diagnosis. Always consult a qualified healthcare professional.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </Layout>
  )
}
