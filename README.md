# 🏠 Apartment Booking Application

Full-stack apartment booking application with React frontend and Express.js backend.

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm run install-all
```

### 2. Environment Configuration

#### Backend Configuration
1. Copy the example configuration file:
```bash
cp backend/config.env.example backend/config.env
```

2. Customize the environment variables in `backend/config.env`:

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=apartment_booking

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=6012
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN=http://localhost:3012

# Security Configuration
BCRYPT_ROUNDS=10
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### Frontend Configuration (Optional)
Create a `.env` file in the `frontend/` directory:

```bash
# API Configuration
REACT_APP_API_URL=http://localhost:6012
REACT_APP_API_VERSION=v1

# App Configuration
REACT_APP_NAME=Apartment Booking App
REACT_APP_VERSION=1.0.0

# Feature Flags
REACT_APP_ENABLE_ANALYTICS=false
REACT_APP_ENABLE_DEBUG_MODE=true
```

### 3. Start the Application
```bash
npm run dev
```

The application will be available at:
- **Frontend:** http://localhost:3012
- **Backend:** http://localhost:6012

## 🔐 Login Credentials

See `CREDENTIALS.md` for detailed login information.

### Quick Access:
- **Admin:** admin@example.com / password
- **User:** john@example.com / password

## ✨ Features

### 👤 Regular User
- Browse apartments
- Book apartments
- Manage reservations
- Add to favorites
- Rate and comment

### 👨‍💼 Admin User
- View all reservations
- Approve/cancel reservations
- Manage users
- Change user roles

## 🛠️ Technologies

### Frontend
- React.js
- React Router
- React Query
- React Hook Form
- Tailwind CSS
- Lucide React (icons)

### Backend
- Node.js
- Express.js
- MySQL
- JWT Authentication
- bcrypt (password hashing)

## 📁 Project Structure

```
├── frontend/          # React application
├── backend/           # Express.js server
├── CREDENTIALS.md     # Login credentials
└── README.md         # This file
```

## 🔧 Development

### Start backend only
```bash
npm run server
```

### Start frontend only
```bash
npm run client
```

### Restart application
```bash
taskkill /f /im node.exe
npm run dev
```

## 🔒 Security Notes

- **Environment Variables**: Never commit sensitive information like passwords or API keys
- **JWT Secret**: Change the JWT secret in production
- **Database**: Use strong passwords for database access
- **CORS**: Configure CORS properly for production
- **Rate Limiting**: Adjust rate limits based on your needs

## 📝 Notes

- **Auto-login** is enabled - token is stored in localStorage and cookies
- **Environment files** are ignored by git for security
- **Database resets** on every application startup
- **Sample data** is automatically added on startup
- **Token expires** after 7 days 