import { useState, FormEvent, ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ToastStack, useToasts } from '../components/Toast';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toasts, push, remove } = useToasts();
  const [form, setForm] = useState({ username: '', password: '' });
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const next: typeof errors = {};
    if (!form.username.trim()) next.username = 'Required';
    if (!form.password.trim()) next.password = 'Required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    
    try {
      const response = await authAPI.login(form.username, form.password);
      
      // Update auth context
      login(response.token, response.user);
      
      push('Logged in successfully!', 'success');
      
      // Redirect to chat page
      setTimeout(() => {
        navigate('/chat');
      }, 500);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Login failed. Please try again.';
      push(errorMessage, 'error');
      setSubmitting(false);
    }
  };

  const update = (key: 'username' | 'password') => (e: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  return (
    <div className="auth-page">
      <div className="form-shell">
        <h2>Welcome Back</h2>
        <p className="subtitle">Sign in to continue to your account</p>

        <form onSubmit={onSubmit} noValidate>
          <div className="form-field">
            <label htmlFor="username">Username or Email</label>
            <input
              id="username"
              placeholder="Enter your username"
              value={form.username}
              onChange={update('username')}
              aria-invalid={Boolean(errors.username)}
            />
            {errors.username && <span className="form-error">{errors.username}</span>}
          </div>

          <div className="form-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={form.password}
              onChange={update('password')}
              aria-invalid={Boolean(errors.password)}
            />
            {errors.password && <span className="form-error">{errors.password}</span>}
          </div>

          <div style={{ textAlign: 'right', marginTop: '-4px', marginBottom: '10px' }}>
            <a href="#" onClick={(e) => {
              e.preventDefault();
              alert('Tough luck 😜');
            }} className="muted">Forgot Password?</a>
          </div>

          <button
            className="btn primary"
            style={{ width: '100%', justifyContent: 'center', display: 'inline-flex' }}
            type="submit"
            disabled={submitting}
          >
            {submitting ? 'Logging in...' : 'Login'}
          </button>

          <Link
            to="/register"
            className="btn ghost"
            style={{ width: '100%', marginTop: '10px', justifyContent: 'center', display: 'inline-flex' }}
          >
            Create Account
          </Link>

          <div className="form-footer" style={{ marginTop: '14px' }}>

            Don’t have an account? <Link to="/register">Sign up now</Link>
          </div>
        </form>
      </div>
      <ToastStack toasts={toasts} onClose={remove} />
    </div>
  );
};

export default LoginPage;
