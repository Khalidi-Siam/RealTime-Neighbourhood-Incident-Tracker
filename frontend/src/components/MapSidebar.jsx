import { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';
import IncidentCard from './IncidentCard.jsx';
import useInfiniteScroll from '../hooks/useInfiniteScroll.jsx';

function MapSidebar({ onIncidentSelect, selectedIncident }) {
  const { currentUser } = useContext(AuthContext);
  const [incidents, setIncidents] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch incidents from backend
  const fetchIncidents = async (pageNum = 1, category = 'All', append = false) => {
    if (pageNum === 1) setInitialLoading(true);
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const query = new URLSearchParams({
        page: pageNum,
        limit: 5,
        category: category === 'All' ? '' : category,
      }).toString();
      
      const response = await fetch(`http://localhost:3000/api/incidents?${query}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch incidents');
      }

      // Append or replace incidents based on append flag
      if (append && pageNum > 1) {
        setIncidents(prev => [...prev, ...data.incidents]);
      } else {
        setIncidents(data.incidents);
      }
      
      setHasNextPage(data.pagination.hasNext);
    } catch (err) {
      setError(err.message);
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
    await fetchIncidents(nextPage, categoryFilter, true);
  }, [hasNextPage, loading, page, categoryFilter]);

  // Infinite scroll hook
  const [lastElementRef, isFetching] = useInfiniteScroll(fetchMoreIncidents, hasNextPage);

  // Initial fetch and refetch on category change or incident create/delete
  useEffect(() => {
    setPage(1);
    fetchIncidents(1, categoryFilter, false);

    const handleIncidentUpdate = () => {
      setPage(1);
      fetchIncidents(1, categoryFilter, false);
    };

    window.addEventListener('incidentCreated', handleIncidentUpdate);
    return () => window.removeEventListener('incidentCreated', handleIncidentUpdate);
  }, [categoryFilter]);

  // Filter incidents by severity (client-side)
  const filteredIncidents = severityFilter === 'All'
    ? incidents
    : incidents.filter((incident) => incident.severity === severityFilter);

  // Handle filter changes
  const handleCategoryChange = (e) => {
    setCategoryFilter(e.target.value);
    // Reset will be handled by useEffect
  };

  const handleSeverityChange = (e) => {
    setSeverityFilter(e.target.value);
  };

  return (
    <div className="map-sidebar">
      <div className="map-sidebar__header">
        <h3>Recent Incidents</h3>
        <div className="map-sidebar__filters">
          <select 
            className="form-control form-control--sm" 
            value={categoryFilter} 
            onChange={handleCategoryChange}
          >
            <option value="All">All Categories</option>
            <option value="Crime">Crime</option>
            <option value="Accident">Accident</option>
            <option value="Lost">Lost</option>
            <option value="Utility">Utility</option>
            <option value="Other">Other</option>
          </select>
          <select 
            className="form-control form-control--sm" 
            value={severityFilter} 
            onChange={handleSeverityChange}
          >
            <option value="All">All Severities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </div>
      </div>
      <div className="map-sidebar__content">
        {initialLoading && <div className="loading">Loading...</div>}
        {error && <div className="alert alert--error">{error}</div>}
        {filteredIncidents.length > 0 ? (
          <>
            {filteredIncidents.map((incident, index) => {
              // Add ref to the last element for infinite scroll detection
              const isLast = index === filteredIncidents.length - 1;
              return (
                <IncidentCard
                  key={incident._id}
                  incident={incident}
                  onSelect={() => onIncidentSelect(incident)}
                  isSelected={selectedIncident && selectedIncident._id === incident._id}
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
        ) : (
          !initialLoading && <p>No incidents found</p>
        )}
      </div>
    </div>
  );
}

export default MapSidebar;