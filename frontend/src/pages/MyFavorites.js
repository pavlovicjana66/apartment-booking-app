import React from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAuth } from '../contexts/AuthContext';
import { Heart, MapPin, Users, Star, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

const MyFavorites = () => {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery(
    ['my-favorites'],
    () => api.get('/api/favorites'),
    {
      enabled: isAuthenticated,
    }
  );

  const removeFavorite = useMutation(
    (apartmentId) => api.delete(`/api/favorites/${apartmentId}`),
    {
      onSuccess: () => {
        toast.success('Removed from favorites');
        queryClient.invalidateQueries(['my-favorites']);
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to remove from favorites');
      },
    }
  );

  if (!isAuthenticated) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Please login to view your favorites.</p>
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
        <p className="text-red-600">Error loading favorites. Please try again.</p>
      </div>
    );
  }

  const favorites = data?.data?.favorites || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Favorites</h1>
        <p className="text-gray-600">Your saved apartments</p>
      </div>

      {favorites.length === 0 ? (
        <div className="text-center py-12">
          <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No favorites yet</h3>
          <p className="text-gray-600">
            You haven't added any apartments to your favorites yet. Start exploring!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favorites.map((favorite) => (
            <div key={favorite.favorite_id} className="card overflow-hidden">
              {/* Image Placeholder */}
              <div className="w-full h-48 bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                <div className="text-primary-600 text-4xl font-bold">
                  {favorite.title.charAt(0)}
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <Link
                    to={`/apartments/${favorite.apartment_id}`}
                    className="text-lg font-semibold text-gray-900 hover:text-primary-600 transition-colors"
                  >
                    {favorite.title}
                  </Link>
                  <button
                    onClick={() => removeFavorite.mutate(favorite.apartment_id)}
                    disabled={removeFavorite.isLoading}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {favorite.description}
                </p>

                <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-4 w-4" />
                    <span>{favorite.location}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Users className="h-4 w-4" />
                    <span>{favorite.capacity} guests</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="text-sm text-gray-600">
                      {favorite.average_rating ? parseFloat(favorite.average_rating).toFixed(1) : '0.0'} 
                      ({favorite.review_count || 0} reviews)
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">
                      ${favorite.price}
                    </div>
                    <div className="text-sm text-gray-500">per night</div>
                  </div>
                </div>

                <div className="mt-4">
                  <span className="inline-block bg-primary-100 text-primary-800 text-xs font-medium px-2.5 py-0.5 rounded">
                    {favorite.category}
                  </span>
                </div>

                <div className="mt-4">
                  <Link
                    to={`/apartments/${favorite.apartment_id}`}
                    className="btn btn-primary w-full text-center"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyFavorites; 