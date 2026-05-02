import { useState, useEffect } from 'react';
import api from '../api';
import { useSocket } from '../hooks/useSocket';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const [stats, setStats] = useState({ scans: 0, threats: 0 });
  const [alerts, setAlerts] = useState<any[]>([]);
  const [scanContent, setScanContent] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  
  const token = localStorage.getItem('token');
  const socket = useSocket(token);
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    
    api.get('/api/dashboard-stats').then(res => setStats(res.data)).catch(() => navigate('/login'));
    api.get('/api/alerts').then(res => setAlerts(res.data));
  }, [token, navigate]);

  useEffect(() => {
    if (!socket) return;
    
    const statsHandler = (data: any) => setStats(data);
    const alertHandler = () => {
      api.get('/api/alerts').then(res => setAlerts(res.data));
    };
    const scanCompleteHandler = (result: any) => {
      setScanResult(result);
      setScanning(false);
    };

    socket.on('dashboard:update', statsHandler);
    socket.on('alert:updated', alertHandler);
    socket.on('scan:complete', scanCompleteHandler);

    return () => { 
      socket.off('dashboard:update', statsHandler);
      socket.off('alert:updated', alertHandler);
      socket.off('scan:complete', scanCompleteHandler);
    };
  }, [socket]);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setScanning(true);
    setScanResult(null);
    try {
      await api.post('/api/scan', { content: scanContent });
      setScanContent('');
    } catch (err) {
      alert('Scan failed');
      setScanning(false);
    }
  };

  const acknowledgeAlert = async (id: string) => {
    try {
      await api.post(`/api/alerts/${id}/acknowledge`);
    } catch (err) {
      alert('Failed to acknowledge alert');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>SOC Dashboard</h1>
        <button onClick={handleLogout} style={{ padding: '5px 10px' }}>Logout</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
        <div style={{ padding: '20px', border: '1px solid #eee', borderRadius: '8px', textAlign: 'center' }}>
          <h3>Scans (24h)</h3>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.scans}</div>
        </div>
        <div style={{ padding: '20px', border: '1px solid #eee', borderRadius: '8px', textAlign: 'center', color: 'red' }}>
          <h3>High-Risk Threats</h3>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.threats}</div>
        </div>
      </div>

      <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #eee', borderRadius: '8px' }}>
        <h3>New Scan</h3>
        <form onSubmit={handleScan}>
          <textarea 
            value={scanContent} 
            onChange={e => setScanContent(e.target.value)} 
            placeholder="Paste URL, Email, or Message content here..."
            style={{ width: '100%', height: '100px', marginBottom: '10px', padding: '10px' }}
            required
          />
          <button type="submit" disabled={scanning} style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}>
            {scanning ? 'Scanning...' : 'Start Analysis'}
          </button>
        </form>
        {scanResult && (
          <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
            <h4>Scan Result:</h4>
            <p>Risk Score: <span style={{ fontWeight: 'bold', color: scanResult.riskScore > 70 ? 'red' : 'green' }}>{scanResult.riskScore}</span></p>
            <p>Verdict: {scanResult.verdict}</p>
          </div>
        )}
      </div>

      <div>
        <h3>Recent Alerts</h3>
        {alerts.length === 0 ? <p>No active alerts.</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                <th style={{ padding: '10px' }}>Severity</th>
                <th style={{ padding: '10px' }}>Message</th>
                <th style={{ padding: '10px' }}>Status</th>
                <th style={{ padding: '10px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert: any) => (
                <tr key={alert.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px' }}>{alert.severity}</td>
                  <td style={{ padding: '10px' }}>{alert.message}</td>
                  <td style={{ padding: '10px' }}>{alert.acknowledged ? 'Acknowledged' : 'Open'}</td>
                  <td style={{ padding: '10px' }}>
                    {!alert.acknowledged && (
                      <button onClick={() => acknowledgeAlert(alert.id)} style={{ padding: '2px 5px' }}>Acknowledge</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
