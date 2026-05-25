import { useState, useRef, useEffect } from 'react'
import Layout from '../components/common/Layout'
import { groqChat } from '../services/api'
import { toast } from 'react-toastify'

const SYSTEM_PROMPTS = {
  chatbot: 'You are a helpful medical assistant AI named HealthBot. Provide helpful, safe, general health information. Always recommend consulting a licensed doctor for proper diagnosis and treatment. Keep responses concise and friendly.',
  symptom: 'You are a medical AI symptom analyzer. When given symptoms, provide: 1) Possible conditions (general info, not diagnosis) 2) Recommended next steps 3) Urgency level (🟢 Low / 🟡 Medium / 🔴 High / 🆘 Emergency) 4) Suggest some general Over-The-Counter (OTC) medicines that do not require doctor supervision to help manage the symptoms. Always strongly advise consulting a real doctor. Be concise.',
}

const starters = {
  chatbot: ['What is high blood pressure?', 'How much water should I drink daily?', 'What are signs of diabetes?', 'Tips for better sleep'],
  symptom: ['I have headache and fever for 2 days', 'Chest pain and shortness of breath', 'Severe stomach pain after eating', 'Dizziness and blurred vision'],
}

export default function ChatbotPage() {
  const [mode, setMode] = useState('chatbot')
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('hc_chat_history_chatbot')
    return saved ? JSON.parse(saved) : [{ role: 'bot', text: 'Hello! I\'m HealthBot 🤖. How can I help you today? You can ask me general health questions or switch to Symptom Checker mode.' }]
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    const saved = localStorage.getItem(`hc_chat_history_${mode}`)
    if (saved) {
      setMessages(JSON.parse(saved))
    } else {
      setMessages([{ role: 'bot', text: mode === 'chatbot' ? 'Hello! I\'m HealthBot 🤖. How can I help you today? You can ask me general health questions or switch to Symptom Checker mode.' : 'Symptom Checker ready. Describe your symptoms.' }])
    }
  }, [mode])

  useEffect(() => {
    localStorage.setItem(`hc_chat_history_${mode}`, JSON.stringify(messages))
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, mode])

  const sendMessage = async (text) => {
    const msg = text || input.trim()
    if (!msg || loading) return
    setInput('')
    const newUserMsg = { role: 'user', text: msg }
    const updatedMessages = [...messages, newUserMsg]
    setMessages(updatedMessages)
    setLoading(true)
    try {
      // Pass full conversation history so Groq has context
      const response = await groqChat(updatedMessages, SYSTEM_PROMPTS[mode])
      setMessages(prev => [...prev, { role: 'bot', text: response }])
    } catch {
      setMessages(prev => [...prev, { role: 'bot', text: 'Sorry, I couldn\'t process that. Please check your API key or try again.' }])
    }
    setLoading(false)
  }

  const startVoice = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      return toast.error('Voice input not supported in this browser')
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.onstart = () => setListening(true)
    recognition.onend = () => setListening(false)
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript
      setInput(transcript)
    }
    recognition.onerror = () => { setListening(false); toast.error('Voice recognition failed') }
    recognition.start()
  }

  const clearChat = () => {
    setMessages([{ role: 'bot', text: mode === 'chatbot' ? 'Chat cleared! How can I help you?' : 'Symptom Checker ready. Describe your symptoms.' }])
  }

  return (
    <Layout title="AI Health Assistant">
      <div style={{ maxWidth: 780, margin: '0 auto' }}>
        {/* Mode Toggle */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          {[
            { key: 'chatbot', icon: '🤖', label: 'Health Chatbot' },
            { key: 'symptom', icon: '🔍', label: 'Symptom Checker' },
          ].map(m => (
            <button key={m.key}
              className={`btn ${mode === m.key ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setMode(m.key)}>
              {m.icon} {m.label}
            </button>
          ))}
          <button className="btn btn-secondary" style={{ marginLeft: 'auto' }} onClick={clearChat}>Clear</button>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">{mode === 'chatbot' ? '🤖 HealthBot Assistant' : '🔍 Symptom Checker'}</h3>
              <p className="text-xs text-muted" style={{ marginTop: 2 }}>Powered by Groq AI • Not a substitute for medical advice</p>
            </div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {/* Messages */}
            <div style={{ height: 420, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {messages.map((m, i) => (
                <div key={i} className={`chat-message ${m.role}`}>
                  <div className="chat-bubble" style={{ whiteSpace: 'pre-wrap' }}>
                    {m.role === 'bot' && <span style={{ marginRight: 6 }}>🤖</span>}
                    {m.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="chat-message bot">
                  <div className="chat-bubble" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span>🤖</span>
                    <span style={{ display: 'flex', gap: 4 }}>
                      {[0,1,2].map(i => (
                        <span key={i} style={{ width: 7, height: 7, background: 'var(--grey-400)', borderRadius: '50%', display: 'inline-block', animation: `bounce 1.2s ease ${i*0.2}s infinite` }} />
                      ))}
                    </span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Starter prompts */}
            <div style={{ padding: '0 20px 12px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {starters[mode].map(s => (
                <button key={s} onClick={() => sendMessage(s)}
                  style={{ fontSize: '0.75rem', padding: '4px 12px', borderRadius: 999, background: 'var(--grey-100)', border: '1px solid var(--grey-200)', cursor: 'pointer', color: 'var(--grey-700)', transition: '0.15s' }}
                  onMouseOver={e => e.currentTarget.style.background = 'var(--primary-light)'}
                  onMouseOut={e => e.currentTarget.style.background = 'var(--grey-100)'}>
                  {s}
                </button>
              ))}
            </div>

            {/* Input Area */}
            <div className="chat-input-area">
              <button onClick={startVoice} title="Voice input"
                style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--grey-200)', background: listening ? '#fee2e2' : 'var(--grey-50)', cursor: 'pointer', fontSize: '1rem', flexShrink: 0 }}>
                {listening ? '🔴' : '🎤'}
              </button>
              <input
                className="form-control"
                placeholder={mode === 'symptom' ? 'Describe your symptoms...' : 'Ask a health question...'}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              />
              <button className="btn btn-primary" onClick={() => sendMessage()} disabled={loading || !input.trim()} style={{ flexShrink: 0 }}>
                Send
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted" style={{ marginTop: 12 }}>
          ⚠️ AI responses are for informational purposes only. Always consult a licensed healthcare professional for medical advice.
        </p>
      </div>

      <style>{`@keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }`}</style>
    </Layout>
  )
}
