import { useState, useEffect } from 'react';
import IncidentCard from '../components/IncidentCard.jsx';

function Feed() {
  const [incidents, setIncidents] = useState([]);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalIncidents: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [filters, setFilters] = useState({
    sortBy: 'timestamp',
    order: -1,
    category: 'All',
  });

  const categories = ['All', 'Crime', 'Safety', 'Utility', 'Other'];

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'sortBy' && { order: value === 'timestamp' ? -1 : value === 'votes.total' ? -1 : 1 }),
    }));
    setPagination(prev => ({ ...prev, currentPage: 1 })); // Reset to page 1 on filter change
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, currentPage: newPage }));
  };

  useEffect(() => {
    console.log('Fetching incidents with filters:', filters, 'page:', pagination.currentPage);
    const fetchIncidents = async () => {
      try {
        const token = localStorage.getItem('token');
        const query = new URLSearchParams({
          page: pagination.currentPage,
          limit: 10,
          category: filters.category,
          sortBy: filters.sortBy,
          order: filters.order,
        }).toString();
        const response = await fetch(`http://localhost:3000/api/incidents?${query}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });
        console.log('Fetch response status:', response.status);
        console.log('Fetch response headers:', [...response.headers.entries()]);

        if (!response.ok) {
          const text = await response.text();
          console.log('Non-JSON response:', text.slice(0, 100));
          throw new Error(`HTTP ${response.status}: ${text.slice(0, 100)}`);
        }

        const data = await response.json();
        console.log('Fetched data:', data);
        if (!data.incidents || !data.pagination) {
          throw new Error('Invalid response format: incidents or pagination missing');
        }
        setIncidents(data.incidents);
        setPagination(data.pagination);
        setError('');
      } catch (err) {
        const errorMessage = err.message || 'Failed to load incidents';
        setError(errorMessage);
        console.error('Fetch error:', errorMessage);
      }
    };

    fetchIncidents();
  }, [filters.sortBy, filters.order, filters.category, pagination.currentPage]);

  return (
    <div className="container">
      <div className="feed-header">
        <h2>Incident Feed</h2>
        <div className="feed-filters">
          <div className="feed-search">
            <input 
              type="text" 
              className="form-control" 
              placeholder="Search incidents..." 
              // You can add search functionality later
            />
          </div>
          <select
            className="form-control"
            value={filters.sortBy}
            onChange={handleFilterChange}
            name="sortBy"
          >
            <option value="timestamp">Newest First</option>
            <option value="timestampAsc">Oldest First</option>
            <option value="votes.total">Most Voted</option>
          </select>
        </div>
      </div>
      <div className="feed-content">
        {error && <div className="error-message">{error}</div>}
        {incidents.length === 0 && !error ? (
          <p className="feed__empty">No incidents to display</p>
        ) : (
          incidents.map((incident) => (
            <IncidentCard
              key={incident.id || incident._id}
              incident={incident}
              onClick={() => console.log('Incident clicked:', incident.id || incident._id)}
              isSelected={false}
            />
          ))
        )}
        
        {/* Pagination */}
        <div className="feed__pagination">
          <button
            className="btn btn--primary"
            onClick={() => handlePageChange(pagination.currentPage - 1)}
            disabled={!pagination.hasPrev}
          >
            Previous
          </button>
          <span className="feed__pagination-info">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          <button
            className="btn btn--primary"
            onClick={() => handlePageChange(pagination.currentPage + 1)}
            disabled={!pagination.hasNext}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export default Feed;