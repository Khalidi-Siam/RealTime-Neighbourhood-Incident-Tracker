import { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';
import { incidentsAPI } from '../utils/api.js';
import { useSocket } from '../context/SocketContext.jsx';
import IncidentCard from './IncidentCard.jsx';
import useInfiniteScroll from '../hooks/useInfiniteScroll.jsx';

/**
 * MapSidebar Component - Displays incidents in a sidebar next to the map
 * 
 * Key differences from Feed:
 * - Always sorts by timestamp (latest first) - no user-configurable sorting
 * - Uses backend filtering for both category and severity
 * - Smaller page size (5 vs 10) for better map integration
 * - Maintains chronological order for real-time updates
 */
function MapSidebar({ onIncidentSelect, selectedIncident }) {
  const { currentUser } = useContext(AuthContext);
  const { socket, joinIncidentsRoom, leaveIncidentsRoom } = useSocket();
  const [incidents, setIncidents] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch incidents from backend - Map sidebar specific filtering
  const fetchMapSidebarIncidents = async (pageNum = 1, append = false) => {
    if (pageNum === 1) setInitialLoading(true);
    setLoading(true);
    setError('');
    
    const filterParams = {
      page: pageNum,
      limit: 5,
      category: categoryFilter === 'All' ? '' : categoryFilter,
      severity: severityFilter === 'All' ? '' : severityFilter,
      sortBy: 'timestamp', // Always sort by timestamp for map sidebar
      order: -1, // Always show latest first (-1 = descending)
    };
    
    console.log('MapSidebar: Fetching incidents with params:', filterParams);
    
    try {
      const data = await incidentsAPI.getAll(filterParams);
      console.log('MapSidebar: Received data:', data);

      // Append or replace incidents based on append flag
      if (append && pageNum > 1) {
        setIncidents(prev => [...prev, ...data.incidents]);
      } else {
        setIncidents(data.incidents);
      }
      
      setHasNextPage(data.pagination.hasNext);
    } catch (err) {
      console.error('MapSidebar: Error fetching incidents:', err);
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
    await fetchMapSidebarIncidents(nextPage, true);
  }, [hasNextPage, loading, page, categoryFilter, severityFilter]);

  // Infinite scroll hook
  const [lastElementRef, isFetching] = useInfiniteScroll(fetchMoreIncidents, hasNextPage);

  // Socket.IO real-time updates
  useEffect(() => {
    if (!socket) return;

    // Join the incidents room for real-time updates
    joinIncidentsRoom();

    // Listen for new incidents
    const handleNewIncident = (data) => {
      console.log('New incident received in sidebar:', data);
      setIncidents(prevIncidents => {
        // Check if incident already exists to avoid duplicates
        const exists = prevIncidents.some(incident => incident._id === data.incident._id);
        if (exists) return prevIncidents;
        
        // Add to the beginning of the list (most recent first) and maintain sort order
        const newIncidents = [data.incident, ...prevIncidents];
        // Sort by timestamp to ensure proper chronological order (newest first)
        return newIncidents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      });
    };

    // Listen for incident deletions
    const handleIncidentDeleted = (data) => {
      console.log('Incident deleted in sidebar:', data);
      setIncidents(prevIncidents => 
        prevIncidents.filter(incident => incident._id !== data.incidentId)
      );
    };

    // Listen for vote updates
    const handleVoteUpdate = (data) => {
      console.log('Vote updated in sidebar:', data);
      setIncidents(prevIncidents => 
        prevIncidents.map(incident => {
          if (incident._id === data.incidentId) {
            // Preserve the current user's vote status, only update counts
            const updatedVotes = {
              upvotes: data.votes.upvotes,
              downvotes: data.votes.downvotes,
              total: data.votes.total,
              userVote: incident.votes.userVote // Keep existing userVote from current state
            };
            
            // If this vote update is from the current user, update their userVote
            if (currentUser && data.voterId === currentUser.id) {
              if (data.action === 'removed') {
                updatedVotes.userVote = null;
              } else {
                updatedVotes.userVote = data.voteType;
              }
            }
            
            return { ...incident, votes: updatedVotes };
          }
          return incident;
        })
      );
    };

    // Listen for false report accepted (admin marks incident as false)
    const handleFalseReportAccepted = (data) => {
      console.log('False report accepted in sidebar:', data);
      setIncidents(prevIncidents => 
        prevIncidents.map(incident => {
          if (incident._id === data.incidentId) {
            return { 
              ...incident, 
              falseFlagVerified: data.incident.falseFlagVerified,
              isFalseFlagged: data.incident.isFalseFlagged
            };
          }
          return incident;
        })
      );
    };

    // Listen for false report rejected (admin restores incident)
    const handleFalseReportRejected = (data) => {
      console.log('False report rejected in sidebar:', data);
      setIncidents(prevIncidents => 
        prevIncidents.map(incident => {
          if (incident._id === data.incidentId) {
            return { 
              ...incident, 
              falseFlagVerified: data.incident.falseFlagVerified,
              isFalseFlagged: data.incident.isFalseFlagged
            };
          }
          return incident;
        })
      );
    };

    // Register event listeners
    socket.on('new-incident', handleNewIncident);
    socket.on('incident-deleted', handleIncidentDeleted);
    socket.on('incident-vote-updated', handleVoteUpdate);
    socket.on('incident-false-report-accepted', handleFalseReportAccepted);
    socket.on('incident-false-report-rejected', handleFalseReportRejected);

    // Cleanup
    return () => {
      socket.off('new-incident', handleNewIncident);
      socket.off('incident-deleted', handleIncidentDeleted);
      socket.off('incident-vote-updated', handleVoteUpdate);
      socket.off('incident-false-report-accepted', handleFalseReportAccepted);
      socket.off('incident-false-report-rejected', handleFalseReportRejected);
      leaveIncidentsRoom();
    };
  }, [socket, joinIncidentsRoom, leaveIncidentsRoom, currentUser]);

  // Initial fetch and refetch on filter changes
  useEffect(() => {
    console.log('MapSidebar: Filter changed, resetting page and fetching incidents', {
      categoryFilter,
      severityFilter
    });
    setPage(1);
    setIncidents([]); // Clear existing incidents
    fetchMapSidebarIncidents(1, false);

    const handleIncidentUpdate = () => {
      console.log('MapSidebar: Incident update detected, refetching');
      setPage(1);
      setIncidents([]); // Clear existing incidents
      fetchMapSidebarIncidents(1, false);
    };

    window.addEventListener('incidentCreated', handleIncidentUpdate);
    return () => window.removeEventListener('incidentCreated', handleIncidentUpdate);
  }, [categoryFilter, severityFilter]); // Trigger on both category and severity changes

  // Remove the client-side filtering since we're now filtering on the backend
  const filteredIncidents = incidents;

  // Handle filter changes - Map sidebar uses backend filtering for both category and severity
  const handleCategoryChange = (e) => {
    setCategoryFilter(e.target.value);
    // Reset will be handled by useEffect
  };

  const handleSeverityChange = (e) => {
    setSeverityFilter(e.target.value);
    // Reset will be handled by useEffect
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