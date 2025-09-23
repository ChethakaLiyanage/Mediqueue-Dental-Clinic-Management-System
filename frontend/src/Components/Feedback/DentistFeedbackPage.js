import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import './dentistfeedback.css';

const API = 'http://localhost:5000';

function StarRow({ value = 0 }) {
  const full = Math.round(value);
  
  return (
    <div className="star-rating" aria-label={`${value} stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg 
          key={i} 
          className={`star-icon ${i < full ? 'star-icon--filled' : 'star-icon--empty'}`}
          viewBox="0 0 20 20"
        >
          <path d="M10 1.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L10 14.8 4.7 17.6l1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
        </svg>
      ))}
    </div>
  );
}

function StatCard({ label, value, colorClass }) {
  return (
    <div className="stat-card">
      <div className="stat-card-label">{label}</div>
      <div className={`stat-card-value ${colorClass}`}>{value}</div>
    </div>
  );
}

function ReviewCard({ review }) {
  const avatarLetter = String(review.comment || 'U').trim().charAt(0).toUpperCase();
  const formattedDate = new Date(review.submitted_date).toLocaleDateString();
  
  return (
    <div className="review-card">
      <div className="review-content">
        <div className="review-avatar">
          {avatarLetter}
        </div>
        <div className="review-details">
          <div className="review-header">
            <span className="review-title">Review</span>
            <StarRow value={Number(review.rating) || 0} />
          </div>
          <div className="review-date">{formattedDate}</div>
          <div className="review-comment">{review.comment || 'No comment provided'}</div>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-state-title">No feedback found</div>
      <div className="empty-state-message">
        Try adjusting your search terms or rating filter to see more results.
      </div>
    </div>
  );
}

export default function FeedbackPage() {
  const [items, setItems] = useState([]);
  const [term, setTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFeedbacks = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await axios.get(`${API}/feedbacks`);
        setItems(response.data?.feedbacks || []);
      } catch (err) {
        console.error('Error fetching feedbacks:', err);
        setError('Failed to load feedback data');
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeedbacks();
  }, []);

  const metrics = useMemo(() => {
    if (!items.length) return { avg: 0, total: 0, newToday: 0 };
    
    const total = items.length;
    const sum = items.reduce((acc, item) => acc + (Number(item.rating) || 0), 0);
    const avg = Math.round((sum / total) * 10) / 10;
    
    const todayStr = new Date().toDateString();
    const newToday = items.filter((feedback) => 
      new Date(feedback.submitted_date).toDateString() === todayStr
    ).length;
    
    return { avg, total, newToday };
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((feedback) => {
      const matchTerm = term
        ? (feedback.comment || '').toLowerCase().includes(term.toLowerCase())
        : true;
      
      const matchRating = ratingFilter === 'all' 
        ? true 
        : String(feedback.rating) === ratingFilter;
      
      return matchTerm && matchRating;
    });
  }, [items, term, ratingFilter]);

  const handleSearchChange = (e) => {
    setTerm(e.target.value);
  };

  const handleRatingFilterChange = (e) => {
    setRatingFilter(e.target.value);
  };

  if (error) {
    return (
      <div className="feedback-page">
        <div className="empty-state">
          <div className="empty-state-title">Error Loading Feedback</div>
          <div className="empty-state-message">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="feedback-page">
      {/* Statistics Cards */}
      <div className="stats-grid">
        <StatCard 
          label="Average Rating" 
          value={metrics.avg} 
          colorClass="stat-card-value--blue" 
        />
        <StatCard 
          label="Total Reviews" 
          value={metrics.total} 
          colorClass="stat-card-value--green" 
        />
        <StatCard 
          label="New Today" 
          value={metrics.newToday} 
          colorClass="stat-card-value--orange" 
        />
      </div>

      {/* Filters Section */}
      <div className="filters-section">
        <input
          className="search-input"
          placeholder="Search reviews..."
          value={term}
          onChange={handleSearchChange}
          type="text"
        />
        
        <select 
          className="rating-select"
          value={ratingFilter} 
          onChange={handleRatingFilterChange}
        >
          <option value="all">All Ratings</option>
          {[5, 4, 3, 2, 1].map((rating) => (
            <option key={rating} value={String(rating)}>
              {rating} star{rating !== 1 ? 's' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Reviews Grid */}
      <div className="reviews-grid">
        {isLoading ? (
          // Loading skeleton
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="review-card loading-shimmer" style={{ height: '120px' }} />
          ))
        ) : filteredItems.length > 0 ? (
          filteredItems.map((review) => (
            <ReviewCard key={review._id} review={review} />
          ))
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}