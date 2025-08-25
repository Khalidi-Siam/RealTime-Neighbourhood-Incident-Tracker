import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  const url = import.meta.env.MODE === "development"
      ? "http://192.168.0.167:3000" // dev backend
      : "https://realtime-neighbourhood-incident-tracker.onrender.com"; 

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io(url, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('Connected to server:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setIsConnected(false);
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.close();
    };
  }, []);

  // Helper functions for joining/leaving rooms
  const joinIncidentsRoom = () => {
    if (socket) {
      socket.emit('join-incidents');
    }
  };

  const leaveIncidentsRoom = () => {
    if (socket) {
      socket.emit('leave-incidents');
    }
  };

  const joinIncidentRoom = (incidentId) => {
    if (socket && incidentId) {
      socket.emit('join-incident', incidentId);
    }
  };

  const leaveIncidentRoom = (incidentId) => {
    if (socket && incidentId) {
      socket.emit('leave-incident', incidentId);
    }
  };

  const value = {
    socket,
    isConnected,
    joinIncidentsRoom,
    leaveIncidentsRoom,
    joinIncidentRoom,
    leaveIncidentRoom
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
