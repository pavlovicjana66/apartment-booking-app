# 🔐 Login Credentials

## Admin User
- **Email:** admin@example.com
- **Password:** password
- **Role:** Admin (can manage reservations and users)

## Regular Users
- **Email:** john@example.com
- **Password:** password
- **Role:** User (can book apartments and manage their reservations)

- **Email:** jane@example.com
- **Password:** password
- **Role:** User (can book apartments and manage their reservations)

## 🚀 How to Login:

1. **Open the application** in your browser: `http://localhost:3000`
2. **Click "Login"** in the navigation
3. **Enter credentials** from the table above
4. **Click "Login"** button

## 🔧 Features:

### Admin User can:
- ✅ View all reservations
- ✅ Approve/cancel reservations
- ✅ Manage users (block/unblock)
- ✅ Change user roles
- ✅ View all apartments

### Regular User can:
- ✅ Browse apartments
- ✅ Book apartments
- ✅ View their reservations
- ✅ Cancel their reservations
- ✅ Add apartments to favorites
- ✅ Rate apartments with comments

## 📝 Notes:
- **Auto-login** is enabled - token is stored in localStorage and cookies
- **Token expires** after 7 days
- **Database resets** on every application startup
- **Sample data** is automatically added on startup

## 🛠️ Troubleshooting:
- If you can't login, check if backend is running on port 5000
- If you have database issues, check MySQL connection
- To reset the application, run `npm run dev` again 