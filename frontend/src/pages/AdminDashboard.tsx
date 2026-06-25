import { useState, useEffect } from 'react';
import { adminAPI, AdminStats } from '../services/api';
import { ToastStack, useToasts } from '../components/Toast';

const subjects = [
  { label: 'History', color: '#22c55e' },
  { label: 'Languages', color: '#3b82f6' },
  { label: 'Mathematics', color: '#ef4444' },
  { label: 'Science', color: '#facc15' },
];
const methods = [
  { label: 'AI Chat', color: '#3b82f6' },
  { label: 'Flashcards', color: '#fb7185' },
  { label: 'Notes', color: '#fbbf24' },
  { label: 'Practice Tests', color: '#22c55e' },
];

const AdminDashboard = () => {
  const { toasts, push, remove } = useToasts();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await adminAPI.getStats();
      setStats(data);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to load statistics';
      push(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="section" style={{ maxWidth: 1200 }}>
        <div className="card">
          <p style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>Loading statistics...</p>
        </div>
      </section>
    );
  }

  if (!stats) {
    return (
      <section className="section" style={{ maxWidth: 1200 }}>
        <div className="card">
          <p style={{ textAlign: 'center', padding: '40px', color: 'var(--error)' }}>Failed to load statistics</p>
        </div>
        <ToastStack toasts={toasts} onClose={remove} />
      </section>
    );
  }

  const metrics = [
    { label: 'Total Users', value: stats.total_users.toString(), delta: `+${stats.new_users_this_week} this week` },
    { label: 'Active Users', value: stats.active_users.toString(), delta: 'Last 7 days' },
    { label: 'Total Chats', value: stats.total_chats.toString(), delta: `+${stats.new_chats_this_week} this week` },
    { label: 'Total Messages', value: stats.total_messages.toString(), delta: `${stats.avg_messages_per_chat.toFixed(1)} avg per chat` },
  ];

  return (
    <section className="section" style={{ maxWidth: 1200 }}>
      <div className="card" style={{ marginBottom: 14 }}>
        <strong>Teacher Buddy Analytics</strong>
        <p className="action-sub">Real-time insights and performance metrics</p>
      </div>

      <div className="admin-grid">
        <div className="admin-row">
          {metrics.map((m) => (
            <div className="card" key={m.label}>
              <strong>{m.label}</strong>
              <p style={{ margin: '4px 0', fontSize: 24, fontWeight: 'bold', color: 'var(--primary)' }}>{m.value}</p>
              <p className="action-sub">{m.delta}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="donut-row" style={{ marginTop: 14 }}>
        <div className="card">
          <strong>Subject Distribution</strong>
          <p className="action-sub" style={{ marginBottom: 12 }}>Coming soon - subject analytics</p>
          <div className="donut" />
          <div className="legend">
            {subjects.map((s) => (
              <span key={s.label}><span className="legend-dot" style={{ background: s.color }} />{s.label}</span>
            ))}
          </div>
        </div>
        <div className="card">
          <strong>Study Methods</strong>
          <p className="action-sub" style={{ marginBottom: 12 }}>Coming soon - usage analytics</p>
          <div className="donut" style={{ background: 'conic-gradient(#3b82f6 0 38%, #fb7185 38% 62%, #fbbf24 62% 78%, #22c55e 78% 100%)' }} />
          <div className="legend">
            {methods.map((s) => (
              <span key={s.label}><span className="legend-dot" style={{ background: s.color }} />{s.label}</span>
            ))}
          </div>
        </div>
      </div>
      
      <ToastStack toasts={toasts} onClose={remove} />
    </section>
  );
};

export default AdminDashboard;
