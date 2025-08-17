import { useEffect, useMemo, useState } from 'react';
import { api } from '../src/api/client.js';

// React conversion of the Auth modal (Login/Register)
export default function AuthModal({
    isOpen = true,
    initialTab = 'login',
    onClose,
    onAuthSuccess,
}) {
    const [activeTab, setActiveTab] = useState(initialTab);

    // Login state
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);

    // Register state
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState(''); // Required by backend
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [registerLoading, setRegisterLoading] = useState(false);

    // UI
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);

    const close = () => {
        if (onClose) onClose();
    };

    const passwordStrength = useMemo(() => {
        const pwd = password || '';
        let score = 0;
        if (pwd.length >= 6) score += 1;
        if (/[A-Z]/.test(pwd)) score += 1;
        if (/[a-z]/.test(pwd)) score += 1;
        if (/\d/.test(pwd)) score += 1;
        if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
        const pct = (score / 5) * 100;
        let label = 'Very Weak';
        if (score >= 4) label = 'Strong';
        else if (score === 3) label = 'Medium';
        else if (score === 2) label = 'Weak';
        return { pct, label };
    }, [password]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoginLoading(true);
        try {
            const res = await api.login({ email: loginEmail, password: loginPassword });
            if (res?.token) localStorage.setItem('token', res.token);
            if (res?.user) localStorage.setItem('user', JSON.stringify(res.user));
            setMessage('Login successful');
            if (onAuthSuccess) onAuthSuccess(res.user, res.token);
            // Optional: close modal
            if (onClose) onClose();
        } catch (err) {
            setError(err.message || 'Login failed');
        } finally {
            setLoginLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if ((phone || '').length !== 11) {
            setError('Phone number must be 11 characters long');
            return;
        }
        setRegisterLoading(true);
        try {
            const res = await api.register({ username: name, email, phone, password });
            if (res?.token) localStorage.setItem('token', res.token);
            if (res?.user) localStorage.setItem('user', JSON.stringify(res.user));
            setMessage('Account created');
            if (onAuthSuccess) onAuthSuccess(res.user, res.token);
            if (onClose) onClose();
        } catch (err) {
            setError(err.message || 'Registration failed');
        } finally {
            setRegisterLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal" id="authModal">
            <div className="modal__backdrop" onClick={close}></div>
            <div className="modal__content">
                <div className="modal__header">
                    <h3 id="authTitle">{activeTab === 'login' ? 'Login' : 'Register'}</h3>
                    <button className="modal__close" id="closeAuthModal" onClick={close} aria-label="Close">&times;</button>
                </div>
                <div className="modal__body">
                    <div className="auth-tabs">
                        <button
                            type="button"
                            className={`auth-tab ${activeTab === 'login' ? 'auth-tab--active' : ''}`}
                            data-tab="login"
                            onClick={() => setActiveTab('login')}
                        >
                            Login
                        </button>
                        <button
                            type="button"
                            className={`auth-tab ${activeTab === 'register' ? 'auth-tab--active' : ''}`}
                            data-tab="register"
                            onClick={() => setActiveTab('register')}
                        >
                            Register
                        </button>
                    </div>

                    {error && (
                        <div className="alert alert--error" role="alert" style={{ marginBottom: 12 }}>
                            {error}
                        </div>
                    )}
                    {message && (
                        <div className="alert alert--success" role="status" style={{ marginBottom: 12 }}>
                            {message}
                        </div>
                    )}

                    {/* Login Form */}
                    <form id="loginForm" className={`auth-form ${activeTab === 'login' ? 'auth-form--active' : ''}`} onSubmit={handleLogin}>
                        <div className="form-group">
                            <label className="form-label" htmlFor="loginEmail">Email</label>
                            <input
                                type="email"
                                className="form-control"
                                id="loginEmail"
                                value={loginEmail}
                                onChange={(e) => setLoginEmail(e.target.value)}
                                required
                                autoComplete="email"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="loginPassword">Password</label>
                            <input
                                type="password"
                                className="form-control"
                                id="loginPassword"
                                value={loginPassword}
                                onChange={(e) => setLoginPassword(e.target.value)}
                                required
                                autoComplete="current-password"
                            />
                        </div>
                        <button type="submit" className="btn btn--primary btn--full-width" disabled={loginLoading}>
                            {loginLoading ? 'Logging in...' : 'Login'}
                        </button>
                        <div className="auth-links">
                            <a href="#" className="auth-link" onClick={(e) => e.preventDefault()}>Forgot password?</a>
                        </div>
                    </form>

                    {/* Register Form */}
                    <form id="registerForm" className={`auth-form ${activeTab === 'register' ? 'auth-form--active' : ''}`} onSubmit={handleRegister}>
                        <div className="form-group">
                            <label className="form-label" htmlFor="registerName">Full Name</label>
                            <input
                                type="text"
                                className="form-control"
                                id="registerName"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                minLength={3}
                                maxLength={20}
                                autoComplete="name"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="registerEmail">Email</label>
                            <input
                                type="email"
                                className="form-control"
                                id="registerEmail"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="registerPhone">Phone</label>
                            <input
                                type="tel"
                                className="form-control"
                                id="registerPhone"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                                required
                                pattern="\\d{11}"
                                placeholder="e.g., 01XXXXXXXXX"
                                autoComplete="tel"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="registerPassword">Password</label>
                            <input
                                type="password"
                                className="form-control"
                                id="registerPassword"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                maxLength={20}
                                autoComplete="new-password"
                            />
                            <div className="password-strength" id="passwordStrength">
                                <div
                                    className="password-strength__bar"
                                    style={{ width: `${passwordStrength.pct}%` }}
                                ></div>
                                <span className="password-strength__text">{password ? `Strength: ${passwordStrength.label}` : 'Password strength'}</span>
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="registerConfirmPassword">Confirm Password</label>
                            <input
                                type="password"
                                className="form-control"
                                id="registerConfirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                autoComplete="new-password"
                            />
                        </div>
                        <button type="submit" className="btn btn--primary btn--full-width" disabled={registerLoading}>
                            {registerLoading ? 'Creating...' : 'Create Account'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
