import { useState, useEffect, useCallback } from 'react';
import IncidentCard from '../components/IncidentCard.jsx';
import useInfiniteScroll from '../hooks/useInfiniteScroll.jsx';

function Feed() {
  const [incidents, setIncidents] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [filters, setFilters] = useState({
    sortBy: 'timestamp',
    order: -1,
    category: 'All',
    severity: 'All',
  });

  const categories = ['All', 'Crime', 'Accident', 'Lost', 'Utility', 'Other'];
  const severities = ['All', 'Low', 'Medium', 'High'];

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'sortBy' && { 
        order: value === 'timestampAsc' ? 1 : -1  // Only 'timestampAsc' uses ascending (1), everything else uses descending (-1)
      }),
    }));
    // Reset will be handled by useEffect
  };

  // Fetch incidents function
  const fetchIncidents = async (pageNum = 1, append = false) => {
    if (pageNum === 1) setInitialLoading(true);
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const query = new URLSearchParams({
        page: pageNum,
        limit: 10,
        category: filters.category === 'All' ? '' : filters.category,
        severity: filters.severity === 'All' ? '' : filters.severity,
        sortBy: filters.sortBy,
        order: filters.order,
      }).toString();
      
      const response = await fetch(`http://localhost:3000/api/incidents?${query}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text.slice(0, 100)}`);
      }

      const data = await response.json();
      if (!data.incidents || !data.pagination) {
        throw new Error('Invalid response format: incidents or pagination missing');
      }
      
      // Filter incidents by severity if backend doesn't support these filters
      let filteredIncidents = data.incidents;
      if (filters.severity !== 'All') {
        filteredIncidents = filteredIncidents.filter(incident => incident.severity === filters.severity);
      }
      
      // Append or replace incidents based on append flag
      if (append && pageNum > 1) {
        setIncidents(prev => [...prev, ...filteredIncidents]);
      } else {
        setIncidents(filteredIncidents);
      }
      
      setHasNextPage(data.pagination.hasNext);
      setError('');
    } catch (err) {
      const errorMessage = err.message || 'Failed to load incidents';
      setError(errorMessage);
      console.error('Fetch error:', errorMessage);
    } finally {
      setLoading(false);
      if (pageNum === 1) setInitialLoading(false);
    }
  };

  // Fetch more incidents for infinite scroll
  const fetchMoreIncidents = useCallback(async () => {
    if (!hasNextPage || loading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchIncidents(nextPage, true);
  }, [hasNextPage, loading, page, filters]);

  // Infinite scroll hook
  const [lastElementRef, isFetching] = useInfiniteScroll(fetchMoreIncidents, hasNextPage);

  useEffect(() => {
    setPage(1);
    fetchIncidents(1, false);
  }, [filters.sortBy, filters.order, filters.category, filters.severity]);

  // Listen for incident deletion events
  useEffect(() => {
    const handleIncidentDeleted = () => {
      // Refresh the incidents list
      setPage(1);
      fetchIncidents(1, false);
    };

    window.addEventListener('incidentDeleted', handleIncidentDeleted);
    return () => window.removeEventListener('incidentDeleted', handleIncidentDeleted);
  }, []);

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
          <div className="filter-controls">
            <select
              className="form-control filter-select"
              value={filters.category}
              onChange={handleFilterChange}
              name="category"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category === 'All' ? 'All Categories' : category}
                </option>
              ))}
            </select>
            <select
              className="form-control filter-select"
              value={filters.severity}
              onChange={handleFilterChange}
              name="severity"
            >
              {severities.map(severity => (
                <option key={severity} value={severity}>
                  {severity === 'All' ? 'All Severities' : severity}
                </option>
              ))}
            </select>
            <select
              className="form-control filter-select"
              value={filters.sortBy}
              onChange={handleFilterChange}
              name="sortBy"
            >
              <option value="timestamp">Newest First</option>
              <option value="timestampAsc">Oldest First</option>
              <option value="votes.upvotes">Most Voted</option>
            </select>
          </div>
        </div>
      </div>
      <div className="feed-content">
        {error && <div className="error-message">{error}</div>}
        {initialLoading && <div className="loading">Loading...</div>}
        {incidents.length === 0 && !error && !initialLoading ? (
          <p className="feed__empty">No incidents to display</p>
        ) : (
          <>
            {incidents.map((incident, index) => {
              // Add ref to the last element for infinite scroll detection
              const isLast = index === incidents.length - 1;
              return (
                <IncidentCard
                  key={incident.id || incident._id}
                  incident={incident}
                  onClick={() => console.log('Incident clicked:', incident.id || incident._id)}
                  isSelected={false}
                  ref={isLast ? lastElementRef : null}
                />
              );
            })}
            {/* Loading indicator for infinite scroll */}
            {(loading && !initialLoading) && (
              <div className="loading" style={{ textAlign: 'center', padding: '1rem' }}>
                Loading more incidents...
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Feed;