import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const cards = [
  {
    icon: "📝",
    title: "Lesson Planning",
    text: "Generate curriculum-aligned lesson plans in minutes with AI-powered suggestions and templates.",
  },
  {
    icon: "📊",
    title: "Progress Tracking",
    text: "Monitor student performance with analytics and insights to inform your teaching.",
  },
  {
    icon: "⏱️",
    title: "Save Time",
    text: "Automate grading and admin tasks so you can focus on teaching.",
  },
];

const stats = [
  { label: "Active Teachers", value: "10,000+" },
  { label: "Lessons Created", value: "500K+" },
  { label: "Saved Per Week", value: "15 hrs" },
];

const LandingPage = () => {
  const { isAuthenticated } = useAuth();
  const hasToken = !!localStorage.getItem('token');
  const getStartedTo = isAuthenticated || hasToken ? '/chat' : '/register';

  return (
    <section className="section">
      <div className="hero">
        <p className="muted">Your AI-Powered Teaching Assistant</p>
        <h1>Streamline lesson planning, grading, and progress tracking.</h1>
        <p>
          Built for educators: generate curriculum-aligned plans, automate assessments, and get actionable insights.
        </p>
        <div className="actions">
          <Link to={getStartedTo} className="btn primary">Get Started</Link>
          <Link to="/about" className="btn ghost">About</Link>
        </div>
      </div>

      <div className="card-grid">
        {cards.map((card) => (
          <div className="card" key={card.title}>
            <div className="icon" aria-hidden>{card.icon}</div>
            <h3>{card.title}</h3>
            <p>{card.text}</p>
          </div>
        ))}
      </div>

      <div className="stats-bar">
        {stats.map((s) => (
          <div className="stat" key={s.label}>
            <strong>{s.value}</strong>
            <span>{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default LandingPage;
