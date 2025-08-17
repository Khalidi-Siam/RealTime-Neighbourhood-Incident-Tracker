import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';
import IncidentCard from './IncidentCard.jsx';

function MapSidebar({ onIncidentSelect, selectedIncident }) {
  const { currentUser } = useContext(AuthContext);
  const [incidents, setIncidents] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalIncidents: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Map votes to severity (placeholder logic since severity isn't in backend schema)
  const mapVotesToSeverity = (incident) => {
    const totalVotes = incident.votes.upvotes + incident.votes.downvotes;
    if (totalVotes > 20) return 'High';
    if (totalVotes > 10) return 'Medium';
    return 'Low';
  };

  // Fetch incidents from backend
  const fetchIncidents = async (pageNum = 1, category = 'All') => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const query = new URLSearchParams({
        page: pageNum,
        limit: 10,
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

      // Add severity to incidents (client-side for now)
      const incidentsWithSeverity = data.incidents.map((incident) => ({
        ...incident,
        severity: mapVotesToSeverity(incident),
      }));

      setIncidents(incidentsWithSeverity);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and refetch on category/page change or incident create/delete
  useEffect(() => {
    fetchIncidents(page, categoryFilter);

    const handleIncidentUpdate = () => {
      fetchIncidents(page, categoryFilter);
    };

    window.addEventListener('incidentCreated', handleIncidentUpdate);
    return () => window.removeEventListener('incidentCreated', handleIncidentUpdate);
  }, [page, categoryFilter]);

  // Filter incidents by severity (client-side)
  const filteredIncidents = severityFilter === 'All'
    ? incidents
    : incidents.filter((incident) => incident.severity === severityFilter);

  // Handle filter changes
  const handleCategoryChange = (e) => {
    setCategoryFilter(e.target.value);
    setPage(1); // Reset to first page on category change
  };

  const handleSeverityChange = (e) => {
    setSeverityFilter(e.target.value);
  };

  // Handle pagination
  const handleNextPage = () => {
    if (pagination.hasNext) {
      setPage((prev) => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (pagination.hasPrev) {
      setPage((prev) => prev - 1);
    }
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
        {loading && <div className="loading">Loading...</div>}
        {error && <div className="alert alert--error">{error}</div>}
        {filteredIncidents.length > 0 ? (
          filteredIncidents.map((incident) => (
            <IncidentCard
              key={incident._id}
              incident={incident}
              onSelect={() => onIncidentSelect(incident)}
              isSelected={selectedIncident && selectedIncident._id === incident._id}
            />
          ))
        ) : (
          !loading && <p>No incidents found</p>
        )}
        
        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="map-sidebar__pagination">
            <button
              className="btn btn--secondary btn--sm"
              onClick={handlePrevPage}
              disabled={!pagination.hasPrev}
            >
              Previous
            </button>
            <span>
              Page {pagination.currentPage} of {pagination.totalPages}
            </span>
            <button
              className="btn btn--secondary btn--sm"
              onClick={handleNextPage}
              disabled={!pagination.hasNext}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default MapSidebar;