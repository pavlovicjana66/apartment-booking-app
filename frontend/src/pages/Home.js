import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { Search, MapPin, Users, Star, Heart } from 'lucide-react';
import api from '../services/api';
import ApartmentCard from '../components/ApartmentCard';
import SearchFilters from '../components/SearchFilters';

const Home = () => {
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    location: '',
    minPrice: '',
    maxPrice: '',
    capacity: '',
    page: 1
  });

  const { data, isLoading, error } = useQuery(
    ['apartments', filters],
    () => api.get('/api/apartments', { params: filters }),
    {
      keepPreviousData: true,
    }
  );

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  const handlePageChange = (page) => {
    setFilters(prev => ({ ...prev, page }));
  };

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
        <p className="text-red-600">Error loading apartments. Please try again.</p>
      </div>
    );
  }

  const { apartments, pagination } = data?.data || { apartments: [], pagination: {} };

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-lg p-8 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4">
            Find Your Perfect Stay
          </h1>
          <p className="text-xl mb-8 text-primary-100">
            Discover amazing apartments for your next trip. Book with confidence and enjoy your stay.
          </p>
          <div className="flex items-center justify-center space-x-4">
            <Search className="h-5 w-5 text-primary-200" />
            <span className="text-primary-200">Search, Book, Enjoy</span>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <SearchFilters filters={filters} onFilterChange={handleFilterChange} />

      {/* Results */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">
            Available Apartments
          </h2>
          <p className="text-gray-600">
            {pagination?.totalItems || 0} apartments found
          </p>
        </div>

        {apartments.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Search className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No apartments found
            </h3>
            <p className="text-gray-600">
              Try adjusting your search criteria or check back later for new listings.
            </p>
          </div>
        ) : (
          <>
            {/* Apartments Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {apartments.map((apartment) => (
                <ApartmentCard key={apartment.apartment_id} apartment={apartment} />
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex justify-center space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-2 text-sm font-medium rounded-md ${
                      page === pagination.currentPage
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                
                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Home; 