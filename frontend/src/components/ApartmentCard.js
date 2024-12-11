import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Users, Star, Heart } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import toast from 'react-hot-toast';

const ApartmentCard = ({ apartment }) => {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const toggleFavorite = useMutation(
    async (apartmentId) => {
      const response = await api.get(`/api/favorites/check/${apartmentId}`);
      const isFavorite = response.data.isFavorite;
      
      if (isFavorite) {
        await api.delete(`/api/favorites/${apartmentId}`);
        toast.success('Removed from favorites');
      } else {
        await api.post('/api/favorites', { apartment_id: apartmentId });
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

  const handleFavoriteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error('Please login to add favorites');
      return;
    }
    toggleFavorite.mutate(apartment.apartment_id);
  };

  return (
    <Link to={`/apartments/${apartment.apartment_id}`} className="block">
      <div className="card hover:shadow-lg transition-shadow duration-200 overflow-hidden">
        {/* Image Placeholder */}
        <div className="aspect-w-16 aspect-h-9 bg-gray-200">
          <div className="w-full h-48 bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
            <div className="text-primary-600 text-4xl font-bold">
              {apartment.title.charAt(0)}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
              {apartment.title}
            </h3>
            <button
              onClick={handleFavoriteClick}
              className="text-gray-400 hover:text-red-500 transition-colors"
              disabled={toggleFavorite.isLoading}
            >
              <Heart className="h-5 w-5" />
            </button>
          </div>

          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
            {apartment.description}
          </p>

          <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
            <div className="flex items-center space-x-1">
              <MapPin className="h-4 w-4" />
              <span>{apartment.location}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Users className="h-4 w-4" />
              <span>{apartment.capacity} guests</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              <Star className="h-4 w-4 text-yellow-400 fill-current" />
              <span className="text-sm text-gray-600">
                {apartment.average_rating ? parseFloat(apartment.average_rating).toFixed(1) : '0.0'} 
                ({apartment.review_count || 0} reviews)
              </span>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-gray-900">
                ${apartment.price}
              </div>
              <div className="text-sm text-gray-500">per night</div>
            </div>
          </div>

          <div className="mt-4">
            <span className="inline-block bg-primary-100 text-primary-800 text-xs font-medium px-2.5 py-0.5 rounded">
              {apartment.category}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ApartmentCard; 