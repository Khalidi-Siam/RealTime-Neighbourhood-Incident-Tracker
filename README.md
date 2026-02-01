# 🚨 RealTime Neighbourhood Incident Tracker

A full-stack web application that enables communities to report, track, and manage local incidents in real-time. Built with React.js and Node.js, featuring interactive maps, real-time updates via WebSockets, and a comprehensive admin dashboard.

![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![React](https://img.shields.io/badge/react-19.1.1-61dafb)

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Installation](#-installation)
- [Environment Variables](#-environment-variables)
- [API Endpoints](#-api-endpoints)
- [Real-Time Features](#-real-time-features)
- [Screenshots](#-screenshots)


## ✨ Features

### 🗺️ Interactive Map View
- Real-time incident visualization on Leaflet maps
- Custom markers with category-specific icons and severity-based colors
- Click-to-report functionality for precise location selection
- Multiple map styles (Streets, Dark, Satellite)
- Auto-locate user position

### 📝 Incident Management
- **Create Incidents**: Report new incidents with title, description, category, severity, and location
- **Categories**: Crime, Accident, Lost Items, Utility Issues, Fire, Infrastructure, Other
- **Severity Levels**: Low, Medium, High
- **Location Support**: Address input with latitude/longitude coordinates

### 👍 Community Engagement
- **Voting System**: Upvote/downvote incidents to indicate relevance
- **Comments**: Nested comment threads with replies on each incident
- **False Report System**: Flag suspicious or false incidents for admin review

### 🔔 Real-Time Updates
- Instant notifications when new incidents are reported
- Live updates for votes, comments, and incident status changes
- Socket.IO-powered bidirectional communication

### 👤 User Management
- User registration and authentication with JWT
- Profile management with profile picture upload (Cloudinary)
- Role-based access control (User/Admin)

### 🛡️ Admin Dashboard
- Review and manage reported incidents
- Verify or dismiss false report claims
- User management (view, search, delete users)
- Mark incidents as verified false reports

### 📊 Additional Features
- **Feed View**: Scrollable list of all incidents with filtering and sorting
- **Infinite Scroll**: Load more incidents seamlessly
- **PDF Export**: Generate PDF reports of incidents
- **Dark/Light Theme**: Toggle between themes
- **Rate Limiting**: Protection against API abuse
- **Responsive Design**: Works on desktop and mobile devices

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 19 | UI Framework |
| Vite 7 | Build Tool & Dev Server |
| React Router DOM | Client-side Routing |
| Leaflet / React-Leaflet | Interactive Maps |
| Socket.IO Client | Real-time Communication |
| React Toastify | Toast Notifications |
| jsPDF | PDF Generation |

### Backend
| Technology | Purpose |
|------------|---------|
| Node.js | Runtime Environment |
| Express 5 | Web Framework |
| MongoDB / Mongoose | Database & ODM |
| Socket.IO | WebSocket Server |
| JWT | Authentication |
| bcryptjs | Password Hashing |
| Cloudinary | Image Storage |
| Zod | Schema Validation |
| Multer | File Upload Handling |
| express-rate-limit | Rate Limiting |

## 📁 Project Structure

```
RealTime-Neighbourhood-Incident-Tracker/
├── backend/
│   ├── server.js              # Express server & Socket.IO setup
│   ├── package.json
│   ├── controllers/           # Request handlers
│   │   ├── auth-controller.js
│   │   ├── incident-controller.js
│   │   ├── comment-controller.js
│   │   ├── vote-controller.js
│   │   └── false-report-controller.js
│   ├── models/                # Mongoose schemas
│   │   ├── user-model.js
│   │   ├── incident-model.js
│   │   ├── comment-model.js
│   │   ├── vote-model.js
│   │   ├── false-report-model.js
│   │   └── db.js
│   ├── routes/                # API route definitions
│   │   ├── auth-route.js
│   │   ├── incident-route.js
│   │   ├── comment-route.js
│   │   ├── vote-route.js
│   │   └── false-report-route.js
│   ├── middlewares/           # Custom middleware
│   │   ├── auth-middleware.js
│   │   ├── error-middleware.js
│   │   ├── rate-limit-middleware.js
│   │   ├── upload-middleware.js
│   │   └── validate-middleware.js
│   ├── validators/            # Zod validation schemas
│   │   ├── auth-validator.js
│   │   ├── incident-validator.js
│   │   └── comment-validator.js
│   └── utils/                 # Utility functions
│       ├── jwt-utils.js
│       └── cloudinary-config.js
│
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx            # Main app component
│       ├── main.jsx           # Entry point
│       ├── components/        # Reusable UI components
│       │   ├── MapView.jsx
│       │   ├── MapSidebar.jsx
│       │   ├── IncidentCard.jsx
│       │   ├── IncidentModal.jsx
│       │   ├── CommentList.jsx
│       │   ├── CommentForm.jsx
│       │   ├── AuthForm.jsx
│       │   ├── Nav.jsx
│       │   └── ...
│       ├── pages/             # Page components
│       │   ├── Home.jsx       # Map view
│       │   ├── Feed.jsx       # Incident feed
│       │   ├── Profile.jsx    # User profile
│       │   ├── AdminDashboard.jsx
│       │   └── NotFound.jsx
│       ├── context/           # React Context providers
│       │   ├── AuthContext.jsx
│       │   ├── SocketContext.jsx
│       │   └── ThemeContext.jsx
│       ├── hooks/             # Custom React hooks
│       │   ├── useInfiniteScroll.jsx
│       │   ├── useRateLimit.jsx
│       │   └── useReportStatus.jsx
│       └── utils/             # Utility functions
│           ├── api.js
│           ├── incidentActions.js
│           └── timeUtils.js
│
└── README.md
```

## 🚀 Installation

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local or Atlas)
- npm or yarn
- Cloudinary account (for image uploads)

### Clone the Repository
```bash
git clone https://github.com/yourusername/RealTime-Neighbourhood-Incident-Tracker.git
cd RealTime-Neighbourhood-Incident-Tracker
```

### Backend Setup
```bash
cd backend
npm install
```

### Frontend Setup
```bash
cd frontend
npm install
```

### Running the Application

**Development Mode:**

Backend:
```bash
cd backend
npm run dev  # or: nodemon server.js
```

Frontend:
```bash
cd frontend
npm run dev
```

**Production Build:**
```bash
cd frontend
npm run build
npm run preview
```

## 🔐 Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/incident-tracker
# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/incident-tracker

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# Cloudinary Configuration (for image uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
```

## 📡 API Endpoints

### Authentication (`/api/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/profile` | Get current user profile |
| PUT | `/api/auth/profile` | Update user profile (with profile picture) |
| DELETE | `/api/auth/profile` | Delete own profile |
| GET | `/api/auth/admin/users` | Get all users (Admin) |
| GET | `/api/auth/admin/users-count` | Get total users count (Admin) |
| DELETE | `/api/auth/admin/users/:userId` | Delete a user (Admin) |

### Incidents (`/api/incidents`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/incidents/submit` | Create new incident |
| GET | `/api/incidents/` | Get all incidents (with pagination & filters) |
| GET | `/api/incidents/:id` | Get incident by ID |
| DELETE | `/api/incidents/:id` | Delete incident |

### Voting (`/api/incidents`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/incidents/:incidentId/vote` | Vote on an incident (upvote/downvote) |
| GET | `/api/incidents/:incidentId/votes` | Get vote counts for an incident |
| GET | `/api/incidents/:incidentId/user-vote` | Get user's vote on specific incident |

### Comments (`/api/incidents` & `/api/comment`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/incidents/:incidentId/comments` | Add a comment to an incident |
| GET | `/api/incidents/:incidentId/comments` | Get comments for an incident |
| PUT | `/api/comment/:id` | Update a comment |
| DELETE | `/api/comment/:id` | Delete a comment |
| POST | `/api/comment/:commentId/reply` | Reply to a comment |

### False Reports (`/api/incidents`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/incidents/:incidentId/report-false` | Report an incident as false |
| GET | `/api/incidents/:incidentId/user-report` | Get user's report status on incident |
| PUT | `/api/incidents/:incidentId/accept` | Accept false report (Admin) |
| PUT | `/api/incidents/:incidentId/reject` | Reject false report (Admin) |
| GET | `/api/incidents/admin/reported-incidents` | Get all reported incidents (Admin) |

## 🔄 Real-Time Features

The application uses Socket.IO for real-time communication:

### Socket Events

**Client to Server:**
- `join-incidents` - Join the general incidents room
- `leave-incidents` - Leave the incidents room
- `join-incident` - Join a specific incident room (for comments)
- `leave-incident` - Leave a specific incident room

**Server to Client:**
- `new-incident` - New incident created
- `incident-updated` - Incident was updated
- `incident-deleted` - Incident was deleted
- `new-comment` - New comment added
- `vote-updated` - Vote count changed

## 📸 Screenshots

### Map View
The main interface showing incidents plotted on an interactive map with custom markers indicating severity and category.

### Feed View
A scrollable list of incidents with filtering options by category, severity, and sorting preferences.

### Admin Dashboard
Management interface for reviewing reported incidents and managing users.


## 🙏 Acknowledgments

- [Leaflet](https://leafletjs.com/) for the amazing mapping library
- [Socket.IO](https://socket.io/) for real-time capabilities
- [MongoDB](https://www.mongodb.com/) for the database
- [Cloudinary](https://cloudinary.com/) for image hosting

---

<p align="center">
  Made with ❤️ for safer neighbourhoods
</p>
