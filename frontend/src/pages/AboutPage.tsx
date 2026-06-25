import { Link } from 'react-router-dom';

const AboutPage = () => {
  return (
    <section className="section">
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1>About Teacher Buddy</h1>
        <p className="action-sub" style={{ marginTop: 12, fontSize: '16px', lineHeight: '1.6' }}>
          Teacher Buddy is an AI-powered teaching assistant designed to help educators streamline their workflow and focus on what matters most: teaching.
        </p>

        <div style={{ marginTop: 32, display: 'grid', gap: 24 }}>
          <div>
            <h2 style={{ fontSize: '20px', marginBottom: 12 }}>Our Mission</h2>
            <p style={{ color: 'var(--muted)', lineHeight: '1.6' }}>
              We believe that educators deserve intelligent tools that reduce administrative burden and enhance teaching effectiveness. By automating repetitive tasks like grading and lesson planning, teachers can dedicate more time to personalized student engagement and meaningful instruction.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: '20px', marginBottom: 12 }}>Key Features</h2>
            <ul style={{ color: 'var(--muted)', lineHeight: '1.8', paddingLeft: '20px' }}>
              <li><strong>Lesson Planning:</strong> Generate curriculum-aligned lesson plans in minutes with AI-powered suggestions and templates.</li>
              <li><strong>Progress Tracking:</strong> Monitor student performance with analytics and insights to inform your teaching decisions.</li>
              <li><strong>Time Saving:</strong> Automate grading and administrative tasks so you can focus on what you do best.</li>
              <li><strong>Resource Library:</strong> Access and organize lesson materials, worksheets, and teaching resources in one place.</li>
              <li><strong>Calendar Management:</strong> Plan classes, assignments, and events with an integrated calendar system.</li>
            </ul>
          </div>

          <div>
            <h2 style={{ fontSize: '20px', marginBottom: 12 }}>Why Teacher Buddy?</h2>
            <p style={{ color: 'var(--muted)', lineHeight: '1.6' }}>
              Teachers spend countless hours on planning, grading, and administrative work. Teacher Buddy leverages cutting-edge AI technology to handle these tasks efficiently, allowing you to invest your energy where it truly matters—in your students' learning and growth.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: '20px', marginBottom: 12 }}>For Educators</h2>
            <p style={{ color: 'var(--muted)', lineHeight: '1.6', marginBottom: 12 }}>
              Whether you're teaching in a classroom of 20 or 200, managing diverse learning needs or focusing on specific curricula, Teacher Buddy adapts to your teaching style and context. Set your preferences once, and watch as AI-powered suggestions become personalized to your classroom.
            </p>
          </div>

          <div style={{ marginTop: 32, padding: '24px', backgroundColor: 'var(--card)', borderRadius: '8px', textAlign: 'center', borderColor: 'var(--border)', border: '1px solid' }}>
            <h3 style={{ marginBottom: 12 }}>Ready to Transform Your Teaching?</h3>
            <p style={{ color: 'var(--muted)', marginBottom: 16 }}>
              Join thousands of educators who are already saving time and improving student outcomes.
            </p>
            <Link to="/register" className="btn primary">
              Get Started Today
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutPage;
