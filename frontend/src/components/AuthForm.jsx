import { useState, useContext, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';
import { toast } from 'react-toastify';

function AuthForm({ onClose }) {
  const { login, register } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('login');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password strength calculator
  const passwordStrength = useMemo(() => {
    const pwd = formData.password || '';
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[a-z]/.test(pwd)) score += 1;
    if (/\d/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
    
    const percentage = (score / 5) * 100;
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
    
    return { percentage, label, color, score };
  }, [formData.password]);

  console.log('AuthForm rendered: activeTab=', activeTab, 'formData=', formData);

  const handleInputChange = (e) => {
    e.stopPropagation();
    console.log('Input changed:', e.target.name, '=', e.target.value);
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setError('');
    setSuccess('');
    setIsLoading(true);
    console.log('Form submitted: activeTab=', activeTab, 'formData=', formData);

    try {
      if (activeTab === 'login') {
        const result = await login(formData.email, formData.password);
        if (result.success) {
          setSuccess(result.message);
          console.log('Login successful:', result.message);
          
          // Show success toast
          toast.success('🎉 Welcome back! Login successful!', {
            position: "top-right",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });

          setTimeout(() => {
            console.log('Closing modal after login');
            onClose();
          }, 1000);
        } else {
          setError(result.message);
          console.log('Login failed:', result.message);
          
          // Show error toast
          toast.error('❌ Login failed: ' + result.message, {
            position: "top-right",
            autoClose: 4000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
        }
      } else {
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          console.log('Register failed: Passwords do not match');
          
          // Show error toast
          toast.error('❌ Passwords do not match', {
            position: "top-right",
            autoClose: 4000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
          return;
        }
        
        if (passwordStrength.score < 2) {
          setError('Password is too weak. Please use a stronger password.');
          toast.error('❌ Password is too weak. Please use a stronger password.', {
            position: "top-right",
            autoClose: 4000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
          return;
        }
        
        const result = await register(formData.username, formData.email, formData.phone, formData.password);
        if (result.success) {
          setSuccess(result.message);
          console.log('Register successful:', result.message);
          
          // Show success toast
          toast.success('🎉 Welcome to the platform! Registration successful!', {
            position: "top-right",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });

          setTimeout(() => {
            console.log('Closing modal after register');
            onClose();
          }, 1000);
        } else {
          setError(result.message);
          console.log('Register failed:', result.message);
          
          // Show error toast
          toast.error('❌ Registration failed: ' + result.message, {
            position: "top-right",
            autoClose: 4000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
        }
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setError('An unexpected error occurred. Please try again.');
      toast.error('❌ An unexpected error occurred. Please try again.', {
        position: "top-right",
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="modern-auth" 
      data-testid="auth-form"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header with animated tabs */}
      <div className="modern-auth__header">
        <div className="modern-auth__tabs">
          <button
            className={`modern-auth__tab ${activeTab === 'login' ? 'modern-auth__tab--active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              console.log('Switching to login tab');
              setActiveTab('login');
              setError('');
              setSuccess('');
            }}
            disabled={isLoading}
          >
            <span className="modern-auth__tab-icon">👤</span>
            Login
          </button>
          <button
            className={`modern-auth__tab ${activeTab === 'register' ? 'modern-auth__tab--active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              console.log('Switching to register tab');
              setActiveTab('register');
              setError('');
              setSuccess('');
            }}
            disabled={isLoading}
          >
            <span className="modern-auth__tab-icon">✨</span>
            Register
          </button>
        </div>
        <div className="modern-auth__tab-indicator"></div>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="modern-alert modern-alert--error" role="alert">
          <span className="modern-alert__icon">❌</span>
          <span className="modern-alert__message">{error}</span>
        </div>
      )}
      {success && (
        <div className="modern-alert modern-alert--success" role="alert">
          <span className="modern-alert__icon">✅</span>
          <span className="modern-alert__message">{success}</span>
        </div>
      )}

      {/* Login Form */}
      {activeTab === 'login' ? (
        <form className="modern-auth__form" onSubmit={handleSubmit}>
          <div className="modern-form-group">
            <label htmlFor="email" className="modern-form-label">
              <span className="modern-form-label__icon">📧</span>
              Email Address
            </label>
            <div className="modern-form-input-wrapper">
              <input
                type="email"
                id="email"
                name="email"
                className="modern-form-input"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter your email"
                required
                disabled={isLoading}
                autoComplete="email"
              />
            </div>
          </div>
          
          <div className="modern-form-group">
            <label htmlFor="password" className="modern-form-label">
              <span className="modern-form-label__icon">🔒</span>
              Password
            </label>
            <div className="modern-form-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                className="modern-form-input"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter your password"
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="modern-form-input__toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </div>
          
          <button 
            type="submit" 
            className={`modern-btn modern-btn--primary modern-btn--full ${isLoading ? 'modern-btn--loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? (
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
      ) : (
        /* Register Form */
        <form className="modern-auth__form" onSubmit={handleSubmit}>
          <div className="modern-form-group">
            <label htmlFor="username" className="modern-form-label">
              <span className="modern-form-label__icon">👤</span>
              Full Name
            </label>
            <div className="modern-form-input-wrapper">
              <input
                type="text"
                id="username"
                name="username"
                className="modern-form-input"
                value={formData.username}
                onChange={handleInputChange}
                placeholder="Enter your full name"
                required
                disabled={isLoading}
                autoComplete="name"
              />
            </div>
          </div>
          
          <div className="modern-form-group">
            <label htmlFor="email" className="modern-form-label">
              <span className="modern-form-label__icon">📧</span>
              Email Address
            </label>
            <div className="modern-form-input-wrapper">
              <input
                type="email"
                id="email"
                name="email"
                className="modern-form-input"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter your email"
                required
                disabled={isLoading}
                autoComplete="email"
              />
            </div>
          </div>
          
          <div className="modern-form-group">
            <label htmlFor="phone" className="modern-form-label">
              <span className="modern-form-label__icon">📱</span>
              Phone Number
            </label>
            <div className="modern-form-input-wrapper">
              <input
                type="tel"
                id="phone"
                name="phone"
                className="modern-form-input"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="01XXXXXXXXX"
                required
                disabled={isLoading}
                autoComplete="tel"
              />
            </div>
          </div>
          
          <div className="modern-form-group">
            <label htmlFor="password" className="modern-form-label">
              <span className="modern-form-label__icon">🔒</span>
              Password
            </label>
            <div className="modern-form-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                className="modern-form-input"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Create a strong password"
                required
                disabled={isLoading}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="modern-form-input__toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
            {formData.password && (
              <div className="modern-password-strength">
                <div className="modern-password-strength__bar">
                  <div 
                    className="modern-password-strength__fill"
                    style={{ 
                      width: `${passwordStrength.percentage}%`,
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
            <label htmlFor="confirmPassword" className="modern-form-label">
              <span className="modern-form-label__icon">🔐</span>
              Confirm Password
            </label>
            <div className="modern-form-input-wrapper">
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                name="confirmPassword"
                className="modern-form-input"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Confirm your password"
                required
                disabled={isLoading}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="modern-form-input__toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
            {formData.confirmPassword && formData.password && (
              <div className={`modern-form-validation ${formData.password === formData.confirmPassword ? 'modern-form-validation--success' : 'modern-form-validation--error'}`}>
                {formData.password === formData.confirmPassword ? (
                  <>✅ Passwords match</>
                ) : (
                  <>❌ Passwords don't match</>
                )}
              </div>
            )}
          </div>
          
          <button 
            type="submit" 
            className={`modern-btn modern-btn--primary modern-btn--full ${isLoading ? 'modern-btn--loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? (
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
  );
}

export default AuthForm;