import React, { useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAuth } from '../contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { MapPin, Users, Star, Heart, BookOpen } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const ApartmentDetail = () => {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [showRatingForm, setShowRatingForm] = useState(false);

  const { data: apartmentData, isLoading } = useQuery(
    ['apartment', id],
    () => api.get(`/api/apartments/${id}`)
  );

  const { data: ratingsData } = useQuery(
    ['ratings', id],
    () => api.get(`/api/ratings/apartment/${id}`),
    {
      onSuccess: (data) => {
        console.log('Ratings data:', data);
      },
      onError: (error) => {
        console.error('Error fetching ratings:', error);
      }
    }
  );

  const { data: averageRatingData } = useQuery(
    ['average-rating', id],
    () => api.get(`/api/ratings/apartment/${id}/average`)
  );

  const createReservation = useMutation(
    (data) => api.post('/api/reservations', data),
    {
      onSuccess: () => {
        toast.success('Reservation created successfully!');
        setShowBookingForm(false);
        queryClient.invalidateQueries(['reservations']);
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to create reservation');
      },
    }
  );

  const createRating = useMutation(
    (data) => api.post('/api/ratings/direct', data),
    {
      onSuccess: () => {
        toast.success('Rating and comment added successfully!');
        setShowRatingForm(false);
        queryClient.invalidateQueries(['ratings', id]);
        queryClient.invalidateQueries(['average-rating', id]);
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to add rating');
      },
    }
  );

  const toggleFavorite = useMutation(
    async () => {
      const response = await api.get(`/api/favorites/check/${id}`);
      const isFavorite = response.data.isFavorite;
      
      if (isFavorite) {
        await api.delete(`/api/favorites/${id}`);
        toast.success('Removed from favorites');
      } else {
        await api.post('/api/favorites', { apartment_id: id });
        toast.success('Added to favorites');
      }
      
      return !isFavorite;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['apartments']);
        queryClient.invalidateQueries(['favorites']);
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to update favorites');
      },
    }
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();

  const {
    register: registerRating,
    handleSubmit: handleSubmitRating,
    formState: { errors: ratingErrors },
    reset: resetRating,
    watch,
  } = useForm();

  const onSubmit = (data) => {
    createReservation.mutate({
      apartment_id: parseInt(id),
      start_time: data.startDate,
      end_time: data.endDate,
    });
  };

  const onSubmitRating = (data) => {
    createRating.mutate({
      apartment_id: parseInt(id),
      value: parseInt(data.rating),
      comment_text: data.comment_text || null,
    });
    resetRating();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!apartmentData?.data?.apartment) {
    return <Navigate to="/" replace />;
  }

  const apartment = apartmentData.data.apartment;
  const ratings = ratingsData?.data?.ratings || [];
  const averageRating = averageRatingData?.data || { average_rating: '0.0', total_ratings: 0 };

  console.log('Ratings data structure:', ratingsData);
  console.log('Ratings array:', ratings);
  console.log('Average rating data:', averageRatingData);

  return (
    <div className="space-y-8">
      {/* Apartment Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {apartment.title}
            </h1>
            <div className="flex items-center space-x-4 text-gray-600">
              <div className="flex items-center space-x-1">
                <MapPin className="h-4 w-4" />
                <span>{apartment.location}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Users className="h-4 w-4" />
                <span>{apartment.capacity} guests</span>
              </div>
              <div className="flex items-center space-x-1">
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                <span>{averageRating.average_rating} ({averageRating.total_ratings} reviews)</span>
              </div>
            </div>
          </div>
          <div className="flex space-x-2">
            {isAuthenticated && (
              <button
                onClick={() => toggleFavorite.mutate()}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                disabled={toggleFavorite.isLoading}
              >
                <Heart className="h-6 w-6" />
              </button>
            )}
            <button
              onClick={() => setShowBookingForm(!showBookingForm)}
              className="btn btn-primary flex items-center space-x-2"
              disabled={!isAuthenticated}
            >
              <BookOpen className="h-4 w-4" />
              <span>Book Now</span>
            </button>
          </div>
        </div>

        {/* Apartment Image Placeholder */}
        <div className="w-full h-64 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center mb-6">
          <div className="text-primary-600 text-6xl font-bold">
            {apartment.title.charAt(0)}
          </div>
        </div>

        {/* Description */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Description</h2>
          <p className="text-gray-600">{apartment.description}</p>
        </div>

        {/* Amenities */}
        {apartment.amenities && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Amenities</h2>
            <div className="flex flex-wrap gap-2">
              {apartment.amenities.split(',').map((amenity, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                >
                  {amenity.trim()}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Price */}
        <div className="text-right">
          <div className="text-3xl font-bold text-gray-900">${apartment.price}</div>
          <div className="text-gray-600">per night</div>
        </div>
      </div>

      {/* Booking Form */}
      {showBookingForm && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Book This Apartment</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Check-in Date
                </label>
                <input
                  type="date"
                  {...register('startDate', {
                    required: 'Check-in date is required',
                    min: {
                      value: new Date().toISOString().split('T')[0],
                      message: 'Check-in date must be in the future',
                    },
                  })}
                  className={`input ${errors.startDate ? 'border-red-500' : ''}`}
                />
                {errors.startDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Check-out Date
                </label>
                <input
                  type="date"
                  {...register('endDate', {
                    required: 'Check-out date is required',
                  })}
                  className={`input ${errors.endDate ? 'border-red-500' : ''}`}
                />
                {errors.endDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.endDate.message}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => setShowBookingForm(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createReservation.isLoading}
                className="btn btn-primary"
              >
                {createReservation.isLoading ? 'Booking...' : 'Confirm Booking'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reviews and Ratings Section */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Star className="h-5 w-5 mr-2" />
            Reviews & Ratings ({ratings.length})
          </h2>
          {isAuthenticated && (
            <button
              onClick={() => setShowRatingForm(!showRatingForm)}
              className="btn btn-secondary"
            >
              {showRatingForm ? 'Cancel' : 'Add Review'}
            </button>
          )}
        </div>

        {/* Add Rating Form */}
        {showRatingForm && isAuthenticated && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <form onSubmit={handleSubmitRating(onSubmitRating)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Rating
                </label>
                <div className="flex items-center space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <label key={star} className="cursor-pointer">
                      <input
                        type="radio"
                        value={star}
                        {...registerRating('rating', {
                          required: 'Rating is required',
                        })}
                        className="sr-only"
                      />
                      <Star
                        className={`h-8 w-8 ${
                          watch('rating') >= star
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    </label>
                  ))}
                </div>
                {ratingErrors.rating && (
                  <p className="mt-1 text-sm text-red-600">{ratingErrors.rating.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Review (Optional)
                </label>
                <textarea
                  {...registerRating('comment_text', {
                    minLength: {
                      value: 10,
                      message: 'Review must be at least 10 characters long',
                    },
                  })}
                  rows={3}
                  className={`input w-full ${ratingErrors.comment_text ? 'border-red-500' : ''}`}
                  placeholder="Share your experience with this apartment..."
                />
                {ratingErrors.comment_text && (
                  <p className="mt-1 text-sm text-red-600">{ratingErrors.comment_text.message}</p>
                )}
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowRatingForm(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createRating.isLoading}
                  className="btn btn-primary"
                >
                  {createRating.isLoading ? 'Posting...' : 'Post Review'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Reviews List */}
        {ratings.length === 0 ? (
          <p className="text-gray-600">No reviews yet. Be the first to review this apartment!</p>
        ) : (
          <div className="space-y-4">
            {ratings.map((rating) => (
              <div key={rating.rating_id} className="border-b border-gray-200 pb-4 last:border-b-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < rating.value ? 'text-yellow-400 fill-current' : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-gray-600">by {rating.user_name}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(rating.created_at).toLocaleDateString()}
                  </span>
                </div>
                {rating.comment_text && (
                  <p className="text-gray-700">{rating.comment_text}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ApartmentDetail; 