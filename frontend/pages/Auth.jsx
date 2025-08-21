import { useEffect, useMemo, useState } from 'react';
import { api } from '../src/api/client.js';

// React conversion of the Auth modal (Login/Register) with modern design
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
    const [showLoginPassword, setShowLoginPassword] = useState(false);

    // Register state
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState(''); // Required by backend
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [registerLoading, setRegisterLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
        let color = '#ef4444';
        
        if (score >= 4) {
            label = 'Strong';
            color = '#22c55e';
        } else if (score === 3) {
            label = 'Medium';
            color = '#f59e0b';
        } else if (score === 2) {
            label = 'Weak';
            color = '#f97316';
        }
        
        return { pct, label, color, score };
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
            setMessage('🎉 Welcome back! Login successful!');
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
        if (passwordStrength.score < 2) {
            setError('Password is too weak. Please use a stronger password.');
            return;
        }
        setRegisterLoading(true);
        try {
            const res = await api.register({ username: name, email, phone, password });
            if (res?.token) localStorage.setItem('token', res.token);
            if (res?.user) localStorage.setItem('user', JSON.stringify(res.user));
            setMessage('🎉 Welcome to the platform! Account created successfully!');
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
        <div className="modern-modal" id="authModal">
            <div className="modern-modal__backdrop" onClick={close}></div>
            <div className="modern-modal__content">
                <button className="modern-modal__close" onClick={close} aria-label="Close">
                    ✕
                </button>
                
                <div className="modern-auth">
                    {/* Header with animated tabs */}
                    <div className="modern-auth__header">
                        <div className="modern-auth__tabs">
                            <button
                                type="button"
                                className={`modern-auth__tab ${activeTab === 'login' ? 'modern-auth__tab--active' : ''}`}
                                onClick={() => {
                                    setActiveTab('login');
                                    setError('');
                                    setMessage('');
                                }}
                                disabled={loginLoading || registerLoading}
                            >
                                <span className="modern-auth__tab-icon">👤</span>
                                Sign In
                            </button>
                            <button
                                type="button"
                                className={`modern-auth__tab ${activeTab === 'register' ? 'modern-auth__tab--active' : ''}`}
                                onClick={() => {
                                    setActiveTab('register');
                                    setError('');
                                    setMessage('');
                                }}
                                disabled={loginLoading || registerLoading}
                            >
                                <span className="modern-auth__tab-icon">✨</span>
                                Sign Up
                            </button>
                        </div>
                    </div>

                    {/* Alert Messages */}
                    {error && (
                        <div className="modern-alert modern-alert--error" role="alert">
                            <span className="modern-alert__icon">❌</span>
                            <span className="modern-alert__message">{error}</span>
                        </div>
                    )}
                    {message && (
                        <div className="modern-alert modern-alert--success" role="status">
                            <span className="modern-alert__icon">✅</span>
                            <span className="modern-alert__message">{message}</span>
                        </div>
                    )}

                    {/* Login Form */}
                    {activeTab === 'login' && (
                        <form className="modern-auth__form" onSubmit={handleLogin}>
                            <div className="modern-form-group">
                                <label className="modern-form-label" htmlFor="loginEmail">
                                    <span className="modern-form-label__icon">📧</span>
                                    Email Address
                                </label>
                                <div className="modern-form-input-wrapper">
                                    <input
                                        type="email"
                                        className="modern-form-input"
                                        id="loginEmail"
                                        value={loginEmail}
                                        onChange={(e) => setLoginEmail(e.target.value)}
                                        placeholder="Enter your email"
                                        required
                                        disabled={loginLoading}
                                        autoComplete="email"
                                    />
                                </div>
                            </div>
                            
                            <div className="modern-form-group">
                                <label className="modern-form-label" htmlFor="loginPassword">
                                    <span className="modern-form-label__icon">🔒</span>
                                    Password
                                </label>
                                <div className="modern-form-input-wrapper">
                                    <input
                                        type={showLoginPassword ? "text" : "password"}
                                        className="modern-form-input"
                                        id="loginPassword"
                                        value={loginPassword}
                                        onChange={(e) => setLoginPassword(e.target.value)}
                                        placeholder="Enter your password"
                                        required
                                        disabled={loginLoading}
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        className="modern-form-input__toggle"
                                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                                        disabled={loginLoading}
                                        aria-label={showLoginPassword ? "Hide password" : "Show password"}
                                    >
                                        {showLoginPassword ? "👁️" : "👁️‍🗨️"}
                                    </button>
                                </div>
                            </div>
                            
                            <button 
                                type="submit" 
                                className={`modern-btn modern-btn--primary modern-btn--full ${loginLoading ? 'modern-btn--loading' : ''}`}
                                disabled={loginLoading}
                            >
                                {loginLoading ? (
                                    <>
                                        <span className="modern-btn__spinner"></span>
                                        Signing in...
                                    </>
                                ) : (
                                    <>
                                        <span className="modern-btn__icon">🚀</span>
                                        Sign In
                                    </>
                                )}
                            </button>
                            
                            <div className="modern-auth__footer">
                                <a href="#" className="modern-auth__link" onClick={(e) => e.preventDefault()}>
                                    Forgot your password?
                                </a>
                            </div>
                        </form>
                    )}

                    {/* Register Form */}
                    {activeTab === 'register' && (
                        <form className="modern-auth__form" onSubmit={handleRegister}>
                            <div className="modern-form-group">
                                <label className="modern-form-label" htmlFor="registerName">
                                    <span className="modern-form-label__icon">👤</span>
                                    Full Name
                                </label>
                                <div className="modern-form-input-wrapper">
                                    <input
                                        type="text"
                                        className="modern-form-input"
                                        id="registerName"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Enter your full name"
                                        required
                                        minLength={3}
                                        maxLength={20}
                                        disabled={registerLoading}
                                        autoComplete="name"
                                    />
                                </div>
                            </div>
                            
                            <div className="modern-form-group">
                                <label className="modern-form-label" htmlFor="registerEmail">
                                    <span className="modern-form-label__icon">📧</span>
                                    Email Address
                                </label>
                                <div className="modern-form-input-wrapper">
                                    <input
                                        type="email"
                                        className="modern-form-input"
                                        id="registerEmail"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Enter your email"
                                        required
                                        disabled={registerLoading}
                                        autoComplete="email"
                                    />
                                </div>
                            </div>
                            
                            <div className="modern-form-group">
                                <label className="modern-form-label" htmlFor="registerPhone">
                                    <span className="modern-form-label__icon">📱</span>
                                    Phone Number
                                </label>
                                <div className="modern-form-input-wrapper">
                                    <input
                                        type="tel"
                                        className="modern-form-input"
                                        id="registerPhone"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                                        placeholder="01XXXXXXXXX"
                                        required
                                        pattern="\\d{11}"
                                        disabled={registerLoading}
                                        autoComplete="tel"
                                    />
                                </div>
                            </div>
                            
                            <div className="modern-form-group">
                                <label className="modern-form-label" htmlFor="registerPassword">
                                    <span className="modern-form-label__icon">🔒</span>
                                    Password
                                </label>
                                <div className="modern-form-input-wrapper">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        className="modern-form-input"
                                        id="registerPassword"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Create a strong password"
                                        required
                                        minLength={6}
                                        maxLength={20}
                                        disabled={registerLoading}
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        className="modern-form-input__toggle"
                                        onClick={() => setShowPassword(!showPassword)}
                                        disabled={registerLoading}
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? "👁️" : "👁️‍🗨️"}
                                    </button>
                                </div>
                                {password && (
                                    <div className="modern-password-strength">
                                        <div className="modern-password-strength__bar">
                                            <div 
                                                className="modern-password-strength__fill"
                                                style={{ 
                                                    width: `${passwordStrength.pct}%`,
                                                    backgroundColor: passwordStrength.color
                                                }}
                                            ></div>
                                        </div>
                                        <span 
                                            className="modern-password-strength__text"
                                            style={{ color: passwordStrength.color }}
                                        >
                                            Strength: {passwordStrength.label}
                                        </span>
                                    </div>
                                )}
                            </div>
                            
                            <div className="modern-form-group">
                                <label className="modern-form-label" htmlFor="registerConfirmPassword">
                                    <span className="modern-form-label__icon">🔐</span>
                                    Confirm Password
                                </label>
                                <div className="modern-form-input-wrapper">
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        className="modern-form-input"
                                        id="registerConfirmPassword"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Confirm your password"
                                        required
                                        disabled={registerLoading}
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        className="modern-form-input__toggle"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        disabled={registerLoading}
                                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                    >
                                        {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
                                    </button>
                                </div>
                                {confirmPassword && password && (
                                    <div className={`modern-form-validation ${password === confirmPassword ? 'modern-form-validation--success' : 'modern-form-validation--error'}`}>
                                        {password === confirmPassword ? (
                                            <>✅ Passwords match</>
                                        ) : (
                                            <>❌ Passwords don't match</>
                                        )}
                                    </div>
                                )}
                            </div>
                            
                            <button 
                                type="submit" 
                                className={`modern-btn modern-btn--primary modern-btn--full ${registerLoading ? 'modern-btn--loading' : ''}`}
                                disabled={registerLoading}
                            >
                                {registerLoading ? (
                                    <>
                                        <span className="modern-btn__spinner"></span>
                                        Creating account...
                                    </>
                                ) : (
                                    <>
                                        <span className="modern-btn__icon">✨</span>
                                        Create Account
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
