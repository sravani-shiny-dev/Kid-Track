import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { roleMeta } from '../data/mockData';

const roles = ['TEACHER', 'PARENT', 'CHILD'];

function Login() {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: roles[0],
    linkedChildId: ''
  });
  const [mode, setMode] = useState('login');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (mode === 'register') {
        await register({
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          linkedChildId: form.linkedChildId || null
        });
      } else {
        await login(form);
      }
      navigate(location.state?.from || '/', { replace: true });
    } catch (submitError) {
      setError(submitError.message || 'Unable to complete request right now.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = (role) => {
    setForm({
      name: form.name,
      email: form.email,
      password: form.password,
      role,
      linkedChildId: form.linkedChildId
    });
    setError('');
  };

  return (
    <div className="login-page">
      <section className="login-showcase">
        <div className="login-showcase-copy">
          <p className="eyebrow">Family learning dashboard</p>
          <h1>One place for teachers, parents, and kids to stay in sync.</h1>
          <p>
            KidTrack keeps progress, homework, notes, and important updates easy to scan on
            any screen size.
          </p>
        </div>

        <div className="showcase-points">
          <article className="showcase-card">
            <strong>Responsive by design</strong>
            <span>Clear navigation, roomy cards, and layouts that adapt smoothly to tablets and phones.</span>
          </article>
          <article className="showcase-card">
            <strong>Faster daily check-ins</strong>
            <span>Role-based dashboards surface the next action instead of overwhelming the user.</span>
          </article>
          <article className="showcase-card">
            <strong>Shared context</strong>
            <span>Parents, teachers, and children all see the same progress story in a simpler format.</span>
          </article>
        </div>
      </section>

      <section className="login-panel">
        <div className="panel-top">
          <p className="eyebrow">KidTrack</p>
          <h1 className="login-title">Login</h1>
          <p className="login-copy">Choose role and {mode === 'login' ? 'sign in' : 'register in DB'}.</p>
        </div>

        <div className="role-preview-grid">
          {roles.map((role) => (
            <button
              key={role}
              type="button"
              className={`role-preview-card ${form.role === role ? 'selected' : ''}`}
              onClick={() => handleRoleChange(role)}
            >
              <span className="role-chip">{roleMeta[role].label}</span>
              <h2>{roleMeta[role].label}</h2>
            </button>
          ))}
        </div>

        <div className="panel-top login-form-head">
          <p className="eyebrow">{mode === 'login' ? 'Login' : 'Register'}</p>
          <h2>{mode === 'login' ? 'Sign in to continue' : 'Create account'}</h2>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {mode === 'register' ? (
            <label>
              <span>Name</span>
              <input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </label>
          ) : null}

          <label>
            <span>Role</span>
            <select value={form.role} onChange={(event) => handleRoleChange(event.target.value)}>
              {roles.map((role) => (
                <option key={role} value={role}>
                  {roleMeta[role].label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
          </label>

          <label>
            <span>Password</span>
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
            />
          </label>

          {mode === 'register' ? (
            <label>
              <span>Linked Child ID (for Parent/Child)</span>
              <input
                value={form.linkedChildId}
                onChange={(event) => setForm({ ...form, linkedChildId: event.target.value })}
              />
            </label>
          ) : null}

          {error ? <p className="form-error">{error}</p> : null}

          <button type="submit" className="primary-btn wide-btn" disabled={submitting}>
            {submitting
              ? (mode === 'login' ? 'Signing In...' : 'Registering...')
              : (mode === 'login'
                ? `Open ${roleMeta[form.role].label} Dashboard`
                : `Register ${roleMeta[form.role].label}`)}
          </button>

          <button
            type="button"
            className="ghost-btn wide-btn"
            onClick={() => {
              setMode((m) => (m === 'login' ? 'register' : 'login'));
              setError('');
            }}
          >
            {mode === 'login' ? 'Need an account? Register' : 'Have account? Back to Login'}
          </button>
        </form>
      </section>
    </div>
  );
}

export default Login;
