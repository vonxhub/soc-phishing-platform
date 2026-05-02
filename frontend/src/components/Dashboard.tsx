import { useState, useEffect } from 'react';
import api from '../api';
import { useSocket } from '../hooks/useSocket';

export default function Dashboard() {
  const [stats, setStats] = useState({ scans: 0, threats: 0 });
  const socket = useSocket(localStorage.getItem('token'));

  useEffect(() => {
    api.get('/api/dashboard-stats').then(res => setStats(res.data));
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.emit('subscribe:dashboard');
    const handler = (data: any) => setStats(data);
    socket.on('dashboard:update', handler);
    return () => { socket.off('dashboard:update', handler); };
  }, [socket]);

  return (
    <div>
      <h1>SOC Dashboard</h1>
      <div>Scans (24h): {stats.scans}</div>
      <div>High-Risk Threats: {stats.threats}</div>
    </div>
  );
}
