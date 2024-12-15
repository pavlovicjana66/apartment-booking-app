# 🏠 Apartment Booking Application

Full-stack apartment booking application with React frontend and Express.js backend.

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm run install-all
```

### 2. Database Configuration
Make sure MySQL is running and credentials are correct in `backend/config.env`:
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=admin
DB_NAME=apartment_booking
```

### 3. Start the Application
```bash
npm run dev
```

The application will be available at:
- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:5000

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

## 📝 Notes

- **Auto-login** is enabled - token is stored in localStorage and cookies
- **Database resets** on every application startup
- **Sample data** is automatically added on startup
- **Token expires** after 7 days 