import { useState, useRef } from 'react';
import Modal from './Modal';

function EditProfileModal({ isOpen, onClose, currentUser, onUpdate }) {
  const [formData, setFormData] = useState({
    username: currentUser?.username || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  
  // Profile picture states
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState(currentUser?.profilePicture || null);
  const [removeProfilePicture, setRemoveProfilePicture] = useState(false);
  const fileInputRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  // Handle profile picture file selection
  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setError('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
        return;
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image file size must be less than 5MB');
        return;
      }
      
      setProfilePicture(file);
      setRemoveProfilePicture(false);
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setProfilePicturePreview(previewUrl);
      setError('');
    }
  };

  // Handle remove profile picture
  const handleRemoveProfilePicture = () => {
    setProfilePicture(null);
    setRemoveProfilePicture(true);
    setProfilePicturePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle click on profile picture area
  const handleProfilePictureClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validation
      if (showPasswordFields) {
        if (!formData.currentPassword) {
          throw new Error('Current password is required to change password');
        }
        if (formData.newPassword !== formData.confirmPassword) {
          throw new Error('New passwords do not match');
        }
        if (formData.newPassword.length < 6) {
          throw new Error('New password must be at least 6 characters long');
        }
      }

      // Prepare update data
      const updateData = {
        username: formData.username,
        email: formData.email,
        phone: formData.phone
      };

      // Add password fields if changing password
      if (showPasswordFields && formData.newPassword) {
        updateData.currentPassword = formData.currentPassword;
        updateData.newPassword = formData.newPassword;
      }

      // Call update function with profile picture data
      await onUpdate(updateData, profilePicture, removeProfilePicture);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Clean up preview URL if it was created from a file
    if (profilePicturePreview && profilePicturePreview.startsWith('blob:')) {
      URL.revokeObjectURL(profilePicturePreview);
    }
    
    setFormData({
      username: currentUser?.username || '',
      email: currentUser?.email || '',
      phone: currentUser?.phone || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setShowPasswordFields(false);
    setError('');
    
    // Reset profile picture states
    setProfilePicture(null);
    setProfilePicturePreview(currentUser?.profilePicture || null);
    setRemoveProfilePicture(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Edit Profile" size="default">
      <form onSubmit={handleSubmit} className="edit-profile-form">
        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        {/* Profile Picture Upload Section */}
        <div className="form-group profile-picture-section">
          <label>Profile Picture</label>
          <div className="profile-picture-container">
            <div 
              className="profile-picture-preview" 
              onClick={handleProfilePictureClick}
              style={{ cursor: 'pointer' }}
            >
              {profilePicturePreview ? (
                <img 
                  src={profilePicturePreview} 
                  alt="Profile preview" 
                  className="profile-picture-img"
                />
              ) : (
                <div className="profile-picture-placeholder">
                  <span>📷</span>
                  <p>Click to upload</p>
                </div>
              )}
            </div>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleProfilePictureChange}
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              style={{ display: 'none' }}
            />
            
            <div className="profile-picture-actions">
              <button
                type="button"
                className="btn btn--secondary btn--small"
                onClick={handleProfilePictureClick}
              >
                {profilePicturePreview ? 'Change Photo' : 'Upload Photo'}
              </button>
              
              {(profilePicturePreview || currentUser?.profilePicture) && (
                <button
                  type="button"
                  className="btn btn--danger btn--small"
                  onClick={handleRemoveProfilePicture}
                >
                  Remove Photo
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
            minLength={3}
            maxLength={20}
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="phone">Phone Number</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
            minLength={11}
            maxLength={11}
            className="form-input"
            placeholder="01XXXXXXXXX"
          />
        </div>

        <div className="form-group">
          <button
            type="button"
            className="btn btn--secondary btn--small"
            onClick={() => setShowPasswordFields(!showPasswordFields)}
          >
            {showPasswordFields ? 'Cancel Password Change' : 'Change Password'}
          </button>
        </div>

        {showPasswordFields && (
          <>
            <div className="form-group">
              <label htmlFor="currentPassword">Current Password</label>
              <input
                type="password"
                id="currentPassword"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                required={showPasswordFields}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                required={showPasswordFields}
                minLength={6}
                maxLength={20}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required={showPasswordFields}
                minLength={6}
                maxLength={20}
                className="form-input"
              />
            </div>
          </>
        )}

        <div className="form-actions">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn--primary"
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Update Profile'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default EditProfileModal;
