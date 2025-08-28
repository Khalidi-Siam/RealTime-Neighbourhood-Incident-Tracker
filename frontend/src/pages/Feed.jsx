import { useState, useEffect, useCallback, useContext } from 'react';
import { useSocket } from '../context/SocketContext.jsx';
import { AuthContext } from '../context/AuthContext.jsx';
import { incidentsAPI } from '../utils/api.js';
import IncidentCard from '../components/IncidentCard.jsx';
import MiniMapModal from '../components/MiniMapModal.jsx';
import IncidentDetailsModal from '../components/IncidentDetailsModal.jsx';
import Modal from '../components/Modal.jsx';
import useInfiniteScroll from '../hooks/useInfiniteScroll.jsx';
import { toast } from 'react-toastify';

function Feed() {
  const { currentUser } = useContext(AuthContext);
  const { socket, joinIncidentsRoom, leaveIncidentsRoom } = useSocket();
  const [incidents, setIncidents] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [showMiniMap, setShowMiniMap] = useState(false);
  const [selectedIncidentForMap, setSelectedIncidentForMap] = useState(null);
  const [showIncidentDetails, setShowIncidentDetails] = useState(false);
  const [selectedIncidentForDetails, setSelectedIncidentForDetails] = useState(null);
  const [filters, setFilters] = useState({
    sortBy: 'timestamp',
    order: -1,
    category: 'All',
    severity: 'All',
  });

  const categories = ['All', 'Crime', 'Accident', 'Lost', 'Utility', 'Fire', 'Infrastructure', 'Other'];
  const severities = ['All', 'Low', 'Medium', 'High'];

  // Handle "Locate on Map" button click
  const handleIncidentLocate = (incident) => {
    console.log('Feed: Locate on map clicked for incident:', incident);
    console.log('Feed: Incident location:', incident.location);
    setSelectedIncidentForMap(incident);
    setShowMiniMap(true);
    // Clear details selection when locating on map
    setSelectedIncidentForDetails(null);
  };

  // Handle incident card click for details
  const handleIncidentDetails = (incident) => {
    console.log('Feed: Incident details clicked for incident:', incident);
    setSelectedIncidentForDetails(incident); // Set this incident as selected for details
    setShowIncidentDetails(true);
    // Clear map location selection when viewing details
    setSelectedIncidentForMap(null);
  };

  // Close mini map modal
  const closeMiniMap = () => {
    console.log('Feed: Closing mini map modal');
    setShowMiniMap(false);
    // Don't clear selectedIncidentForMap here - keep the map selection persistent until user takes another action
  };

  // Close incident details modal
  const closeIncidentDetails = () => {
    console.log('Feed: Closing incident details modal');
    setShowIncidentDetails(false);
    // Don't clear selectedIncidentForDetails here - keep the selection persistent
  };

  // Debug state changes
  useEffect(() => {
    console.log('Feed: showMiniMap state changed:', showMiniMap);
    console.log('Feed: selectedIncidentForMap:', selectedIncidentForMap);
    console.log('Feed: showIncidentDetails state changed:', showIncidentDetails);
    console.log('Feed: selectedIncidentForDetails:', selectedIncidentForDetails);
  }, [showMiniMap, selectedIncidentForMap, showIncidentDetails, selectedIncidentForDetails]);

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
      const filterParams = {
        page: pageNum,
        limit: 10,
        category: filters.category === 'All' ? '' : filters.category,
        severity: filters.severity === 'All' ? '' : filters.severity,
        sortBy: filters.sortBy,
        order: filters.order,
      };
      
      const data = await incidentsAPI.getAll(filterParams);
      
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

  // Socket.IO real-time updates
  useEffect(() => {
    if (!socket) return;

    // Join the incidents room for real-time updates
    joinIncidentsRoom();

    // Listen for new incidents
    const handleNewIncident = (data) => {
      console.log('New incident received in feed:', data);
      setIncidents(prevIncidents => {
        // Check if incident already exists to avoid duplicates
        const exists = prevIncidents.some(incident => incident._id === data.incident._id);
        if (exists) return prevIncidents;
        
        // Add to the beginning of the list (most recent first)
        return [data.incident, ...prevIncidents];
      });
      
      toast.success(data.message || 'New incident reported!', {
        position: "top-right",
        autoClose: 4000,
      });
    };

    // Listen for incident deletions
    const handleIncidentDeleted = (data) => {
      console.log('Incident deleted in feed:', data);
      setIncidents(prevIncidents => 
        prevIncidents.filter(incident => incident._id !== data.incidentId)
      );
    };

    // Listen for vote updates
    const handleVoteUpdate = (data) => {
      console.log('Vote updated in feed:', data);
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
      console.log('False report accepted in feed:', data);
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
      console.log('False report rejected in feed:', data);
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
  }, [socket, joinIncidentsRoom, leaveIncidentsRoom]);

  // Listen for incident deletion events (from non-socket sources)
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
                  onSelect={() => handleIncidentLocate(incident)}
                  onCardClick={() => handleIncidentDetails(incident)}
                  isSelected={
                    (selectedIncidentForMap && selectedIncidentForMap._id === incident._id) || 
                    (!selectedIncidentForMap && selectedIncidentForDetails && selectedIncidentForDetails._id === incident._id)
                  }
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

      {/* Mini Map Modal */}
      <MiniMapModal
        isOpen={showMiniMap}
        onClose={closeMiniMap}
        incident={selectedIncidentForMap}
      />

      {/* Incident Details Modal */}
      <Modal
        isOpen={showIncidentDetails}
        onClose={closeIncidentDetails}
        title="Incident Details"
        size="default"
      >
        {selectedIncidentForDetails && (
          <div className="incident-details-modal-wrapper">
            <IncidentDetailsModal
              incident={selectedIncidentForDetails}
              onClose={closeIncidentDetails}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}

export default Feed;