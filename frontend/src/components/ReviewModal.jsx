import { useState } from 'react'
import { toast } from 'react-toastify'
import { doctorAPI } from '../services/api'

export default function ReviewModal({ doctorId, doctorName, appointmentId, patientId, onClose, onSubmitted }) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Please select a star rating')
      return
    }
    setSubmitting(true)
    try {
      await doctorAPI.submitReview(doctorId, {
        rating,
        reviewText: reviewText.trim() || null,
        appointmentId
      })
      toast.success('Review submitted successfully! Thank you for your feedback.')
      onSubmitted?.()
      onClose()
    } catch (err) {
      const msg = typeof err.response?.data === 'string' ? err.response.data : 'Failed to submit review'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const ratingLabels = ['', 'Poor', 'Below Average', 'Good', 'Very Good', 'Excellent']
  const ratingColors = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981']

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <h3 className="modal-title">Rate Your Experience</h3>
          <button className="btn btn-sm btn-secondary" onClick={onClose}>✕</button>
        </div>

        <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--grey-600)', marginBottom: 4 }}>
            How was your consultation with
          </p>
          <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>
            Dr. {doctorName}?
          </p>
        </div>

        {/* Star Rating */}
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{ display: 'inline-flex', gap: 8, marginBottom: 8 }}>
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                  fontSize: '2.2rem', transition: 'transform 0.15s ease, filter 0.15s ease',
                  transform: (hoverRating || rating) >= star ? 'scale(1.15)' : 'scale(1)',
                  filter: (hoverRating || rating) >= star ? 'none' : 'grayscale(1) opacity(0.3)',
                }}
                aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
              >
                ⭐
              </button>
            ))}
          </div>
          {(hoverRating || rating) > 0 && (
            <p style={{
              fontSize: '0.85rem', fontWeight: 700, transition: '0.2s',
              color: ratingColors[hoverRating || rating],
              minHeight: 20,
            }}>
              {ratingLabels[hoverRating || rating]}
            </p>
          )}
        </div>

        {/* Review Text */}
        <div className="form-group" style={{ marginTop: 8 }}>
          <label className="form-label">Write a review (optional)</label>
          <textarea
            className="form-control"
            placeholder="Share your experience — how was the consultation, diagnosis, behavior..."
            value={reviewText}
            onChange={e => setReviewText(e.target.value)}
            rows={4}
            style={{ resize: 'vertical' }}
          />
          <p style={{ fontSize: '0.72rem', color: 'var(--grey-400)', textAlign: 'right', marginTop: 4 }}>
            {reviewText.length} / 1000
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting || rating === 0}>
            {submitting ? <><span className="btn-spinner"></span> Submitting...</> : '⭐ Submit Review'}
          </button>
        </div>
      </div>
    </div>
  )
}
