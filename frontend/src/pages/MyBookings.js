import React from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, MapPin, Users, Star, X, CheckCircle, Clock, XCircle, CreditCard } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const MyBookings = () => {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery(
    ['my-reservations'],
    () => api.get('/api/reservations/my'),
    {
      enabled: isAuthenticated,
    }
  );

  const cancelReservation = useMutation(
    (reservationId) => api.put(`/api/reservations/${reservationId}/cancel`),
    {
      onSuccess: () => {
        toast.success('Reservation cancelled successfully');
        queryClient.invalidateQueries(['my-reservations']);
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to cancel reservation');
      },
    }
  );

  const processPayment = useMutation(
    (reservationId) => api.post(`/api/payments/process`, { reservation_id: reservationId }),
    {
      onSuccess: () => {
        toast.success('Payment processed successfully!');
        queryClient.invalidateQueries(['my-reservations']);
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to process payment');
      },
    }
  );

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Please login to view your bookings.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error loading bookings. Please try again.</p>
      </div>
    );
  }

  const reservations = data?.data?.reservations || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Bookings</h1>
        <p className="text-gray-600">Manage your apartment reservations</p>
      </div>

      {reservations.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings yet</h3>
          <p className="text-gray-600">
            You haven't made any reservations yet. Start exploring apartments!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reservations.map((reservation) => (
            <div key={reservation.reservation_id} className="card p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {reservation.title}
                  </h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <MapPin className="h-4 w-4" />
                      <span>{reservation.location}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4" />
                      <span>${reservation.price}/night</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(reservation.status)}
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(reservation.status)}`}>
                    {reservation.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">Check-in</p>
                  <p className="text-sm text-gray-600">
                    {new Date(reservation.start_time).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Check-out</p>
                  <p className="text-sm text-gray-600">
                    {new Date(reservation.end_time).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  Booked on {new Date(reservation.created_at).toLocaleDateString()}
                </div>
                <div className="flex items-center space-x-2">
                  {reservation.status === 'confirmed' && (
                    <button
                      onClick={() => processPayment.mutate(reservation.reservation_id)}
                      disabled={processPayment.isLoading}
                      className="btn btn-primary flex items-center space-x-2"
                    >
                      <CreditCard className="h-4 w-4" />
                      <span>Pay Now</span>
                    </button>
                  )}
                  {reservation.status === 'pending' && (
                    <button
                      onClick={() => cancelReservation.mutate(reservation.reservation_id)}
                      disabled={cancelReservation.isLoading}
                      className="btn btn-danger flex items-center space-x-2"
                    >
                      <X className="h-4 w-4" />
                      <span>Cancel</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyBookings; 