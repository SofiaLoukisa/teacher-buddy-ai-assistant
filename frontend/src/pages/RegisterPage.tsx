import { useState, FormEvent, ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ToastStack, useToasts } from '../components/Toast';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

type RegisterForm = {
  username: string;
  email: string;
  password: string;
  password2: string;
  dob: string;
};

const RegisterPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toasts, push, remove } = useToasts();
  const [form, setForm] = useState<RegisterForm>({ username: '', email: '', password: '', password2: '', dob: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof RegisterForm, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const next: Partial<Record<keyof RegisterForm, string>> = {};
    if (!form.username.trim()) next.username = 'Required';
    if (!form.email.trim()) next.email = 'Required';
    if (!form.password.trim()) next.password = 'Required';
    if (!form.password2.trim()) next.password2 = 'Required';
    if (form.password && form.password2 && form.password !== form.password2) next.password2 = 'Passwords do not match';
    if (!form.dob) next.dob = 'Required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    
    try {
      const response = await authAPI.register(form.username, form.email, form.password);
      
      // Update auth context
      login(response.token, response.user);
      
      push('Registration successful!', 'success');
      
      // Redirect to chat page
      setTimeout(() => {
        navigate('/chat');
      }, 500);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Registration failed. Please try again.';
      push(errorMessage, 'error');
      setSubmitting(false);
    }
  };

  const update = (key: keyof RegisterForm) => (e: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  return (
    <div className="auth-page">
      <div className="form-shell form-shell--compact">
        <h2>Create Account</h2>
        <p className="subtitle">Sign up to get started</p>

        <form onSubmit={onSubmit} noValidate>
          <div className="form-field">
            <label htmlFor="username">Username</label>
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
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={form.email}
              onChange={update('email')}
              aria-invalid={Boolean(errors.email)}
            />
            {errors.email && <span className="form-error">{errors.email}</span>}
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

          <div className="form-field">
            <label htmlFor="password2">Repeat Password</label>
            <input
              id="password2"
              type="password"
              placeholder="Repeat your password"
              value={form.password2}
              onChange={update('password2')}
              aria-invalid={Boolean(errors.password2)}
            />
            {errors.password2 && <span className="form-error">{errors.password2}</span>}
          </div>

          <div className="form-field">
            <label htmlFor="dob">Date of Birth</label>
            <input
              id="dob"
              type="date"
              value={form.dob}
              onChange={update('dob')}
              aria-invalid={Boolean(errors.dob)}
            />
            {errors.dob && <span className="form-error">{errors.dob}</span>}
          </div>

          <button
            className="btn primary"
            style={{ width: '100%', justifyContent: 'center', display: 'inline-flex' }}
            type="submit"
            disabled={submitting}
          >
            {submitting ? 'Registering...' : 'Register'}
          </button>

          <div className="form-footer" style={{ marginTop: '14px' }}>
            Already have an account? <Link to="/login">Sign in</Link>
          </div>
        </form>
      </div>
      <ToastStack toasts={toasts} onClose={remove} />
    </div>
  );
};

export default RegisterPage;
