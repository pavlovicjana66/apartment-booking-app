import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { Users, Home, Calendar, CreditCard, Star, Settings, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

const AdminDashboard = () => {
  const { isAuthenticated, isAdmin, user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const [reservations, setReservations] = useState([]);
  const [loadingReservations, setLoadingReservations] = useState(false);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [dashboardStats, setDashboardStats] = useState({
    totalUsers: 0,
    totalApartments: 0,
    activeReservations: 0,
    totalRevenue: 0
  });
  const [loadingStats, setLoadingStats] = useState(false);
  const [recentActivities, setRecentActivities] = useState([]);

  useEffect(() => {
    fetchDashboardStats();
    fetchRecentActivities();
  }, []);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      console.log('Fetching users...');
      const response = await api.get('/api/users');
      console.log('Users response:', response.data);
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error(`Failed to load users: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchDashboardStats = async () => {
    setLoadingStats(true);
    try {
      console.log('Fetching dashboard stats...');
      
      // Fetch users count
      const usersResponse = await api.get('/api/users');
      const totalUsers = usersResponse.data.users?.length || 0;
      
      // Fetch apartments count
      const apartmentsResponse = await api.get('/api/apartments');
      const totalApartments = apartmentsResponse.data.apartments?.length || 0;
      
      // Fetch active reservations count
      const reservationsResponse = await api.get('/api/reservations');
      const activeReservations = reservationsResponse.data.reservations?.filter(r => r.status === 'confirmed').length || 0;
      
      // Fetch total revenue from payments (completed payments only)
      let totalRevenue = 0;
      try {
        const paymentsResponse = await api.get('/api/payments');
        totalRevenue = paymentsResponse.data.payments
          ?.filter(p => p.status === 'completed')
          ?.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0;
        console.log('Payments fetched successfully:', paymentsResponse.data.payments?.length || 0, 'payments');
      } catch (paymentsError) {
        console.error('Error fetching payments:', paymentsError);
        console.error('Payments error response:', paymentsError.response?.data);
        // Continue with 0 revenue if payments fail
        totalRevenue = 0;
      }
      
      setDashboardStats({
        totalUsers,
        totalApartments,
        activeReservations,
        totalRevenue: totalRevenue.toFixed(2)
      });
      
      console.log('Dashboard stats:', {
        totalUsers,
        totalApartments,
        activeReservations,
        totalRevenue
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      console.error('Error response:', error.response?.data);
      toast.error('Failed to load dashboard statistics');
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchRecentActivities = async () => {
    try {
      console.log('Fetching recent activities...');
      
      const activities = [];
      
      // Get recent reservations
      const reservationsResponse = await api.get('/api/reservations');
      const recentReservations = reservationsResponse.data.reservations?.slice(0, 3) || [];
      
      recentReservations.forEach(reservation => {
        activities.push({
          type: 'New Booking',
          description: `Reservation for ${reservation.title || 'Apartment'}`,
          time: new Date(reservation.created_at).toLocaleDateString(),
        });
      });
      
      // Get recent users
      const usersResponse = await api.get('/api/users');
      const recentUsers = usersResponse.data.users?.slice(0, 2) || [];
      
      recentUsers.forEach(user => {
        activities.push({
          type: 'New User',
          description: `${user.name || user.email} registered`,
          time: new Date(user.created_at).toLocaleDateString(),
        });
      });
      
      // Sort by creation date and take latest 5
      activities.sort((a, b) => new Date(b.time) - new Date(a.time));
      setRecentActivities(activities.slice(0, 5));
      
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      // Set default activities if fetch fails
      setRecentActivities([
        {
          type: 'System',
          description: 'Dashboard loaded successfully',
          time: new Date().toLocaleDateString(),
        }
      ]);
    }
  };

  const handleUserAction = async (userId, action) => {
    try {
      // Prevent admin from blocking themselves
      if (action === 'block' && currentUser?.user_id === userId) {
        toast.error('You cannot block yourself');
        return;
      }
      
      // Prevent admin from changing their own role to user
      if (action === 'makeUser' && currentUser?.user_id === userId) {
        toast.error('You cannot change your own role to user');
        return;
      }
      
      if (action === 'block') {
        await api.put(`/api/users/${userId}/block`);
        toast.success('User blocked successfully!');
      } else if (action === 'unblock') {
        await api.put(`/api/users/${userId}/unblock`);
        toast.success('User unblocked successfully!');
      } else if (action === 'makeAdmin') {
        await api.put(`/api/users/${userId}/role`, { role: 'admin' });
        toast.success('User role updated to admin!');
      } else if (action === 'makeUser') {
        await api.put(`/api/users/${userId}/role`, { role: 'user' });
        toast.success('User role updated to user!');
      }
      
      // Refresh users list
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    }
  };

  const fetchReservations = async () => {
    setLoadingReservations(true);
    try {
      console.log('Fetching reservations...');
      const token = localStorage.getItem('token');
      console.log('Token:', token ? 'Present' : 'Missing');
      
      const response = await api.get('/api/reservations');
      console.log('Response:', response.data);
      setReservations(response.data.reservations || []);
    } catch (error) {
      console.error('Error fetching reservations:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      if (error.response?.status === 401) {
        toast.error('Please login as admin to view reservations');
      } else if (error.response?.status === 403) {
        toast.error('Admin access required');
      } else {
        toast.error(`Failed to load reservations: ${error.response?.data?.error || error.message}`);
      }
    } finally {
      setLoadingReservations(false);
    }
  };

  const handleReservationAction = async (reservationId, action) => {
    try {
      if (action === 'approve') {
        await api.put(`/api/reservations/${reservationId}/status`, { status: 'confirmed' });
        toast.success('Reservation approved successfully!');
      } else if (action === 'cancel') {
        await api.put(`/api/reservations/${reservationId}/status`, { status: 'cancelled' });
        toast.success('Reservation cancelled successfully!');
      }
      
      // Refresh reservations list
      fetchReservations();
    } catch (error) {
      console.error('Error updating reservation:', error);
      toast.error('Failed to update reservation');
    }
  };

  const handleAdminAction = (action) => {
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      
      switch (action) {
        case 'users':
          setCurrentView('users');
          fetchUsers();
          break;
        case 'apartments':
          toast.success('Apartment Management - Coming Soon!');
          break;
        case 'reservations':
          setCurrentView('reservations');
          fetchReservations();
          break;
        case 'payments':
          toast.success('Payments - Coming Soon!');
          break;
        case 'reviews':
          toast.success('Reviews - Coming Soon!');
          break;
        case 'settings':
          toast.success('Settings - Coming Soon!');
          break;
        default:
          toast.error('Action not implemented yet');
      }
    }, 500);
  };

  const UsersView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button 
            onClick={() => setCurrentView('dashboard')}
            className="mr-4 p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
        </div>
        <button 
          onClick={fetchUsers}
          className="btn btn-secondary"
          disabled={loadingUsers}
        >
          {loadingUsers ? 'Loading...' : 'Refresh'}
        </button>
      </div>
      
      <div className="card p-6">
        {loadingUsers ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold">Name</th>
                  <th className="text-left py-3 px-4 font-semibold">Email</th>
                  <th className="text-left py-3 px-4 font-semibold">Role</th>
                  <th className="text-left py-3 px-4 font-semibold">Status</th>
                  <th className="text-left py-3 px-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.user_id} className="border-b border-gray-100">
                    <td className="py-3 px-4">{user.name}</td>
                    <td className="py-3 px-4">{user.email}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-sm ${
                        user.role === 'admin' 
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-sm ${
                        user.is_deleted 
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {user.is_deleted ? 'Blocked' : 'Active'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {!user.is_deleted ? (
                        <>
                          {/* Hide block button for current admin user */}
                          {!(currentUser?.user_id === user.user_id) && (
                            <button 
                              onClick={() => handleUserAction(user.user_id, 'block')}
                              className="text-red-600 hover:text-red-800 text-sm mr-2"
                            >
                              Block
                            </button>
                          )}
                          {user.role === 'user' && (
                            <button 
                              onClick={() => handleUserAction(user.user_id, 'makeAdmin')}
                              className="text-purple-600 hover:text-purple-800 text-sm mr-2"
                            >
                              Make Admin
                            </button>
                          )}
                          {user.role === 'admin' && user.user_id !== 1 && !(currentUser?.user_id === user.user_id) && (
                            <button 
                              onClick={() => handleUserAction(user.user_id, 'makeUser')}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              Make User
                            </button>
                          )}
                          {/* Show indicator for current user */}
                          {currentUser?.user_id === user.user_id && (
                            <span className="text-gray-500 text-sm italic">(You)</span>
                          )}
                        </>
                      ) : (
                        <button 
                          onClick={() => handleUserAction(user.user_id, 'unblock')}
                          className="text-green-600 hover:text-green-800 text-sm"
                        >
                          Unblock
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  const ReservationsView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button 
            onClick={() => setCurrentView('dashboard')}
            className="mr-4 p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-2xl font-bold text-gray-900">All Reservations</h2>
        </div>
        <button 
          onClick={fetchReservations}
          className="btn btn-secondary"
          disabled={loadingReservations}
        >
          {loadingReservations ? 'Loading...' : 'Refresh'}
        </button>
      </div>
      
      <div className="card p-6">
        {loadingReservations ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading reservations...</p>
          </div>
        ) : reservations.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">No reservations found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold">User</th>
                  <th className="text-left py-3 px-4 font-semibold">Apartment</th>
                  <th className="text-left py-3 px-4 font-semibold">Dates</th>
                  <th className="text-left py-3 px-4 font-semibold">Status</th>
                  <th className="text-left py-3 px-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((reservation) => (
                  <tr key={reservation.reservation_id} className="border-b border-gray-100">
                    <td className="py-3 px-4">{reservation.user_name}</td>
                    <td className="py-3 px-4">{reservation.title}</td>
                    <td className="py-3 px-4">
                      {new Date(reservation.start_time).toLocaleDateString()} - {new Date(reservation.end_time).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-sm ${
                        reservation.status === 'confirmed' 
                          ? 'bg-green-100 text-green-800'
                          : reservation.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : reservation.status === 'cancelled'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {reservation.status === 'pending' && (
                        <>
                          <button 
                            onClick={() => handleReservationAction(reservation.reservation_id, 'approve')}
                            className="text-blue-600 hover:text-blue-800 text-sm mr-2"
                          >
                            Approve
                          </button>
                          <button 
                            onClick={() => handleReservationAction(reservation.reservation_id, 'cancel')}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      {reservation.status === 'confirmed' && (
                        <button 
                          onClick={() => handleReservationAction(reservation.reservation_id, 'cancel')}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  if (currentView === 'users') {
    return <UsersView />;
  }

  if (currentView === 'reservations') {
    return <ReservationsView />;
  }

  const stats = [
    {
      title: 'Total Users',
      value: loadingStats ? '...' : dashboardStats.totalUsers.toString(),
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Total Apartments',
      value: loadingStats ? '...' : dashboardStats.totalApartments.toString(),
      icon: Home,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Active Reservations',
      value: loadingStats ? '...' : dashboardStats.activeReservations.toString(),
      icon: Calendar,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    {
      title: 'Total Revenue',
      value: loadingStats ? '...' : `$${dashboardStats.totalRevenue}`,
      icon: CreditCard,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">Manage your apartment booking platform</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="card p-6">
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="card p-6">
          <div className="flex items-center mb-4">
            <Users className="h-6 w-6 text-blue-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">User Management</h3>
          </div>
          <p className="text-gray-600 mb-4">
            View and manage user accounts, roles, and permissions.
          </p>
          <button 
            className="btn btn-primary w-full"
            onClick={() => handleAdminAction('users')}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Manage Users'}
          </button>
        </div>

        <div className="card p-6">
          <div className="flex items-center mb-4">
            <Home className="h-6 w-6 text-green-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Apartment Management</h3>
          </div>
          <p className="text-gray-600 mb-4">
            Add, edit, or remove apartment listings and manage categories.
          </p>
          <button 
            className="btn btn-primary w-full"
            onClick={() => handleAdminAction('apartments')}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Manage Apartments'}
          </button>
        </div>

        <div className="card p-6">
          <div className="flex items-center mb-4">
            <Calendar className="h-6 w-6 text-yellow-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Reservations</h3>
          </div>
          <p className="text-gray-600 mb-4">
            View all reservations, manage bookings, and handle cancellations.
          </p>
          <button 
            className="btn btn-primary w-full"
            onClick={() => handleAdminAction('reservations')}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'View Reservations'}
          </button>
        </div>

        <div className="card p-6">
          <div className="flex items-center mb-4">
            <CreditCard className="h-6 w-6 text-purple-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Payments</h3>
          </div>
          <p className="text-gray-600 mb-4">
            Monitor payment transactions and handle refunds.
          </p>
          <button 
            className="btn btn-primary w-full"
            onClick={() => handleAdminAction('payments')}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'View Payments'}
          </button>
        </div>

        <div className="card p-6">
          <div className="flex items-center mb-4">
            <Star className="h-6 w-6 text-orange-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Reviews</h3>
          </div>
          <p className="text-gray-600 mb-4">
            Moderate user reviews and ratings for apartments.
          </p>
          <button 
            className="btn btn-primary w-full"
            onClick={() => handleAdminAction('reviews')}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Manage Reviews'}
          </button>
        </div>

        <div className="card p-6">
          <div className="flex items-center mb-4">
            <Settings className="h-6 w-6 text-gray-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Settings</h3>
          </div>
          <p className="text-gray-600 mb-4">
            Configure platform settings and system preferences.
          </p>
          <button 
            className="btn btn-primary w-full"
            onClick={() => handleAdminAction('settings')}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'System Settings'}
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {recentActivities.map((activity, index) => (
            <div key={index} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-b-0">
              <div>
                <p className="font-medium text-gray-900">{activity.type}</p>
                <p className="text-sm text-gray-600">{activity.description}</p>
              </div>
              <span className="text-sm text-gray-500">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 