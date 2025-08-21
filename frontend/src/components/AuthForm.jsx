import { useState, useContext } from 'react';
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
    console.log('Form submitted: activeTab=', activeTab, 'formData=', formData);

    if (activeTab === 'login') {
      const result = await login(formData.email, formData.password);
      if (result.success) {
        setSuccess(result.message);
        console.log('Login successful:', result.message);
        
        // Show success toast
        toast.success('Login successful! Welcome back!', {
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
        toast.error('Login failed: ' + result.message, {
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
        toast.error('Passwords do not match', {
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
        toast.success('Registration successful! Welcome to the platform!', {
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
        toast.error('Registration failed: ' + result.message, {
          position: "top-right",
          autoClose: 4000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      }
    }
  };

  return (
    <div 
      className="auth" 
      data-testid="auth-form"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="auth__tabs">
        <button
          className={`auth__tab ${activeTab === 'login' ? 'auth__tab--active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            console.log('Switching to login tab');
            setActiveTab('login');
          }}
        >
          Login
        </button>
        <button
          className={`auth__tab ${activeTab === 'register' ? 'auth__tab--active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            console.log('Switching to register tab');
            setActiveTab('register');
          }}
        >
          Register
        </button>
      </div>

      {error && <div className="alert alert--error">{error}</div>}
      {success && <div className="alert alert--success">{success}</div>}

      {activeTab === 'login' ? (
        <form className="auth__form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
            />
          </div>
          <button type="submit" className="btn btn--primary">
            Login
          </button>
          <a href="#" className="auth__forgot">
            Forgot password?
          </a>
        </form>
      ) : (
        <form className="auth__form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Full Name</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="phone">Phone</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="01XXXXXXXXX"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
            />
            <div className="password-strength">Password strength</div>
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              required
            />
          </div>
          <button type="submit" className="btn btn--primary">
            Create Account
          </button>
        </form>
      )}
    </div>
  );
}

export default AuthForm;