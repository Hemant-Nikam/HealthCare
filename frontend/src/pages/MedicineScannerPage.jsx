import { useState, useRef, useEffect } from 'react'
import Layout from '../components/common/Layout'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'
import { groqChat } from '../services/api'

export default function MedicineScannerPage() {
  const [method, setMethod] = useState('image') // 'image' or 'text'
  const [imagePreview, setImagePreview] = useState(null)
  const [imageBase64, setImageBase64] = useState(null)
  const [searchText, setSearchText] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  
  const [isScanning, setIsScanning] = useState(false)
  const [drugInfo, setDrugInfo] = useState(null)
  const [insights, setInsights] = useState(null)
  const [loadingInsights, setLoadingInsights] = useState(false)
  
  const fileInputRef = useRef(null)
  const navigate = useNavigate()
  const suggestionBoxRef = useRef(null)

  // Handle click outside for suggestions dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionBoxRef.current && !suggestionBoxRef.current.contains(event.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Debounced search for autocomplete
  useEffect(() => {
    if (method !== 'text' || searchText.trim().length < 2) {
      setSuggestions([])
      return
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`https://clinicaltables.nlm.nih.gov/api/rxterms/v3/search?terms=${encodeURIComponent(searchText)}&ef=STRENGTHS_AND_FORMS,RXCUIS`)
        const data = await res.json()
        
        if (data[1] && data[1].length > 0) {
          const names = data[1]
          const strengths = data[2].STRENGTHS_AND_FORMS
          const rxcuis = data[2].RXCUIS

          const formatted = names.map((name, i) => {
            const routeMatch = name.match(/\((.*?)\)/)
            const route = routeMatch ? routeMatch[1] : 'N/A'
            const genericName = name.split(' (')[0]
            
            return {
              fullName: name,
              genericName: genericName,
              strength: strengths[i] ? strengths[i][0] : 'N/A',
              route: route,
              rxcui: rxcuis[i] ? rxcuis[i][0] : 'N/A'
            }
          })
          setSuggestions(formatted)
          setShowSuggestions(true)
        } else {
          setSuggestions([])
        }
      } catch (err) {
        console.error('Autocomplete error:', err)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchText, method])

  const loadInsights = async (drug) => {
    setLoadingInsights(true)
    setInsights(null)
    try {
      const prompt = `You are a clinical pharmacologist AI. The user is asking about the medicine: ${drug.fullName}.
Provide a JSON object exactly matching this format, with no markdown formatting or backticks around it:
{
  "usedFor": "1-2 primary diseases or conditions this medicine treats",
  "whenToTake": "Brief instructions on when and how to take it (e.g. 'With food in the morning')",
  "supervisionNeeded": "Yes/No, and if it's an Rx or OTC drug",
  "sideEffects": "2-3 common side effects",
  "importantPoints": "1-2 critical warnings or important points"
}`
      const response = await groqChat(prompt)
      let parsed = null
      try {
        const cleaned = response.replace(/```json/g, '').replace(/```/g, '').trim()
        parsed = JSON.parse(cleaned)
      } catch (e) {
        parsed = { error: "Failed to parse clinical insights." }
      }
      setInsights(parsed)
    } catch (err) {
      console.error('Insights error:', err)
      setInsights({ error: "Failed to load clinical insights." })
    } finally {
      setLoadingInsights(false)
    }
  }

  const selectDrug = (drug) => {
    setSearchText(drug.fullName)
    setDrugInfo(drug)
    setShowSuggestions(false)
    toast.success('Medicine info loaded!')
    loadInsights(drug)
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    // Check size (OCR.space limit is 1024 KB for free API, but base64 limit is 1MB)
    if (file.size > 1024 * 1024) {
      toast.error('Image is too large. Please upload an image smaller than 1MB.')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result)
      setImageBase64(reader.result) // The entire data URL including `data:image/jpeg;base64,`
      setDrugInfo(null)
    }
    reader.readAsDataURL(file)
  }

  const triggerScan = async () => {
    let queryText = searchText
    setIsScanning(true)
    setDrugInfo(null)

    try {
      if (method === 'image') {
        if (!imageBase64) {
          toast.error('Please upload an image first')
          setIsScanning(false)
          return
        }
        
        toast.info('Extracting text from image...')
        const formData = new FormData()
        formData.append('base64Image', imageBase64)
        formData.append('apikey', 'K82787960388957')
        formData.append('language', 'eng')

        const ocrRes = await fetch('https://api.ocr.space/parse/image', {
          method: 'POST',
          body: formData
        })
        const ocrData = await ocrRes.json()
        
        if (ocrData.IsErroredOnProcessing || !ocrData.ParsedResults || ocrData.ParsedResults.length === 0) {
          throw new Error('Failed to extract text from image.')
        }
        
        queryText = ocrData.ParsedResults[0].ParsedText
        if (!queryText || queryText.trim().length === 0) {
          throw new Error('No text found in the image.')
        }
        
        // Use the first long word as the likely medicine name for better RxNorm results
        // Use the first prominent word as the likely medicine name
        const words = queryText.split(/[\s\n]+/).filter(w => w.length > 3)
        if (words.length > 0) {
          queryText = words[0]
        }
        
        setSearchText(queryText)
        toast.success(`Extracted text: ${queryText}. Searching database...`)
        
        // Search Clinical Tables API for the best match
        const res = await fetch(`https://clinicaltables.nlm.nih.gov/api/rxterms/v3/search?terms=${encodeURIComponent(queryText)}&ef=STRENGTHS_AND_FORMS,RXCUIS`)
        const data = await res.json()

        if (data[1] && data[1].length > 0) {
          const name = data[1][0]
          const strength = data[2].STRENGTHS_AND_FORMS[0] ? data[2].STRENGTHS_AND_FORMS[0][0] : 'N/A'
          const rxcui = data[2].RXCUIS[0] ? data[2].RXCUIS[0][0] : 'N/A'
          
          const routeMatch = name.match(/\((.*?)\)/)
          const route = routeMatch ? routeMatch[1] : 'N/A'
          const genericName = name.split(' (')[0]

          const drug = {
            fullName: name,
            genericName: genericName,
            strength: strength,
            route: route,
            rxcui: rxcui
          }
          setDrugInfo(drug)
          setSearchText(name)
          toast.success('Medicine info retrieved successfully!')
          loadInsights(drug)
        } else {
          throw new Error('Medicine not found in the database. Please try adjusting the image or typing the name.')
        }
      } else {
        if (!queryText.trim()) {
          toast.error('Please enter a medicine name')
          setIsScanning(false)
          return
        }
        // If method is text and they hit enter without selecting from dropdown
        if (suggestions.length > 0) {
           selectDrug(suggestions[0])
        } else {
           toast.info('No direct match found. Please select from the dropdown suggestions.')
        }
      }
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'An error occurred during scanning')
    } finally {
      setIsScanning(false)
    }
  }

  const addToReminders = () => {
    if (!drugInfo) return
    
    // Read current reminders from localStorage
    let reminders = []
    try {
      reminders = JSON.parse(localStorage.getItem('hc_reminders') || '[]')
    } catch (e) {
      reminders = []
    }
    
    // Check if it already exists
    const exists = reminders.some(r => r.medicineName.toLowerCase() === drugInfo.fullName.toLowerCase())
    if (exists) {
      toast.info('This medicine is already in your reminders.')
      navigate('/reminders')
      return
    }

    // Add new reminder
    const newReminder = {
      id: Date.now(),
      medicineName: drugInfo.fullName,
      dosage: drugInfo.strength || '',
      times: ['08:00'], // Default time
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      notes: `Added via Medicine Scanner (${drugInfo.route})`,
      active: true,
      createdAt: new Date().toISOString()
    }
    
    reminders.push(newReminder)
    localStorage.setItem('hc_reminders', JSON.stringify(reminders))
    
    toast.success('Added to Reminders!')
    navigate('/reminders')
  }

  return (
    <Layout title="Medicine Scanner">
      <div className="section-wrapper">
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          
          <div style={{
            background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
            borderRadius: 'var(--radius)', padding: '32px', marginBottom: 24,
            color: 'white', textAlign: 'center'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>🔍💊</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: 8 }}>
              Smart Medicine Scanner
            </h2>
            <p style={{ opacity: 0.85, fontSize: '0.9rem' }}>
              Upload a picture of your medicine packaging or type its name to get detailed clinical information.
            </p>
          </div>

          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-body">
              <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                <button 
                  className={`btn ${method === 'image' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ flex: 1 }}
                  onClick={() => setMethod('image')}
                >
                  📷 Scan Image
                </button>
                <button 
                  className={`btn ${method === 'text' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ flex: 1 }}
                  onClick={() => setMethod('text')}
                >
                  ⌨️ Type Name
                </button>
              </div>

              {method === 'image' && (
                <div style={{ textAlign: 'center' }}>
                  <div 
                    style={{ 
                      border: '2px dashed var(--grey-300)', 
                      borderRadius: 'var(--radius)', 
                      padding: imagePreview ? '8px' : '40px 20px', 
                      marginBottom: 16,
                      background: 'var(--grey-50)',
                      cursor: 'pointer'
                    }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {imagePreview ? (
                      <img src={imagePreview} alt="Medicine Preview" style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 'var(--radius)' }} />
                    ) : (
                      <>
                        <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>📸</div>
                        <p style={{ fontWeight: 600, color: 'var(--grey-700)' }}>Click to upload an image</p>
                        <p className="text-muted text-sm">JPG, PNG (Max 1MB)</p>
                      </>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      ref={fileInputRef} 
                      style={{ display: 'none' }} 
                      onChange={handleImageChange}
                    />
                  </div>
                </div>
              )}

              {method === 'text' && (
                <div className="form-group" style={{ position: 'relative' }} ref={suggestionBoxRef}>
                  <label className="form-label">Medicine Name</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g., Tylenol, Amoxicillin" 
                    value={searchText}
                    onChange={(e) => {
                      setSearchText(e.target.value)
                      setShowSuggestions(true)
                      setDrugInfo(null)
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onKeyDown={(e) => e.key === 'Enter' && triggerScan()}
                    autoComplete="off"
                  />
                  
                  {showSuggestions && suggestions.length > 0 && (
                    <ul style={{
                      position: 'absolute',
                      top: '100%', left: 0, right: 0,
                      background: 'white', border: '1px solid var(--grey-300)',
                      borderRadius: '0 0 var(--radius) var(--radius)',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                      maxHeight: 250, overflowY: 'auto',
                      listStyle: 'none', padding: 0, margin: 0, zIndex: 10
                    }}>
                      {suggestions.map((drug, idx) => (
                        <li 
                          key={idx}
                          style={{
                            padding: '10px 16px', borderBottom: '1px solid var(--grey-100)',
                            cursor: 'pointer', transition: 'background 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--grey-50)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          onClick={() => selectDrug(drug)}
                        >
                          <div style={{ fontWeight: 600, color: 'var(--grey-800)' }}>{drug.fullName}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--grey-500)', marginTop: 2 }}>
                            {drug.strength} • RxCUI: {drug.rxcui}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <button 
                className="btn btn-primary w-full" 
                onClick={triggerScan}
                disabled={isScanning || (method === 'image' && !imageBase64)}
              >
                {isScanning ? '⏳ Scanning Database...' : '🔍 Analyze Medicine'}
              </button>
            </div>
          </div>

          {drugInfo && (
            <div className="card" style={{ borderLeft: '4px solid var(--primary)', animation: 'slideUp 0.3s ease' }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="card-title">Scan Results</h3>
                <span className="badge badge-success">Verified by RxNorm</span>
              </div>
              <div className="card-body">
                <div style={{ marginBottom: 20 }}>
                  <h4 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--grey-900)', marginBottom: 4 }}>
                    {drugInfo.fullName}
                  </h4>
                  <p className="text-muted text-sm">RxCUI: {drugInfo.rxcui}</p>
                </div>
                
                <div className="grid-2" style={{ gap: '16px', marginBottom: 24 }}>
                  <div style={{ background: 'var(--grey-50)', padding: 12, borderRadius: 8 }}>
                    <p className="text-muted text-sm" style={{ marginBottom: 2 }}>Generic Name</p>
                    <p style={{ fontWeight: 600, color: 'var(--grey-800)' }}>{drugInfo.genericName}</p>
                  </div>
                  <div style={{ background: 'var(--grey-50)', padding: 12, borderRadius: 8 }}>
                    <p className="text-muted text-sm" style={{ marginBottom: 2 }}>Strength / Dosage</p>
                    <p style={{ fontWeight: 600, color: 'var(--grey-800)' }}>{drugInfo.strength}</p>
                  </div>
                  <div style={{ background: 'var(--grey-50)', padding: 12, borderRadius: 8 }}>
                    <p className="text-muted text-sm" style={{ marginBottom: 2 }}>Route</p>
                    <p style={{ fontWeight: 600, color: 'var(--grey-800)' }}>{drugInfo.route}</p>
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 600, borderBottom: '1px solid var(--grey-200)', paddingBottom: 8, marginBottom: 12 }}>
                    🤖 AI Clinical Insights
                  </h4>
                  {loadingInsights ? (
                    <div style={{ color: 'var(--primary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="spinner" style={{ width: 16, height: 16, border: '2px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
                      Analyzing medical data...
                    </div>
                  ) : insights ? (
                    insights.error ? (
                      <p style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>{insights.error}</p>
                    ) : (
                      <div className="grid-2" style={{ gap: '12px' }}>
                        <div style={{ background: 'rgba(139, 92, 246, 0.05)', borderLeft: '3px solid var(--secondary)', padding: '12px 16px', borderRadius: '0 8px 8px 0', gridColumn: '1 / -1' }}>
                          <p style={{ fontSize: '0.8rem', color: 'var(--secondary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Used For (Indications)</p>
                          <p style={{ fontSize: '0.9rem', color: 'var(--grey-800)' }}>{insights.usedFor}</p>
                        </div>
                        <div style={{ background: 'rgba(16, 185, 129, 0.05)', borderLeft: '3px solid var(--success)', padding: '12px 16px', borderRadius: '0 8px 8px 0' }}>
                          <p style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>When to Take</p>
                          <p style={{ fontSize: '0.9rem', color: 'var(--grey-800)' }}>{insights.whenToTake}</p>
                        </div>
                        <div style={{ background: 'rgba(59, 130, 246, 0.05)', borderLeft: '3px solid var(--primary)', padding: '12px 16px', borderRadius: '0 8px 8px 0' }}>
                          <p style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Supervision</p>
                          <p style={{ fontSize: '0.9rem', color: 'var(--grey-800)' }}>{insights.supervisionNeeded}</p>
                        </div>
                        <div style={{ background: 'rgba(245, 158, 11, 0.05)', borderLeft: '3px solid var(--warning)', padding: '12px 16px', borderRadius: '0 8px 8px 0' }}>
                          <p style={{ fontSize: '0.8rem', color: 'var(--warning)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Side Effects</p>
                          <p style={{ fontSize: '0.9rem', color: 'var(--grey-800)' }}>{insights.sideEffects}</p>
                        </div>
                        <div style={{ background: 'rgba(239, 68, 68, 0.05)', borderLeft: '3px solid var(--danger)', padding: '12px 16px', borderRadius: '0 8px 8px 0' }}>
                          <p style={{ fontSize: '0.8rem', color: 'var(--danger)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Important Points</p>
                          <p style={{ fontSize: '0.9rem', color: 'var(--grey-800)' }}>{insights.importantPoints}</p>
                        </div>
                      </div>
                    )
                  ) : null}
                </div>

                <button className="btn btn-success w-full" onClick={addToReminders}>
                  + Add to My Reminders
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </Layout>
  )
}
