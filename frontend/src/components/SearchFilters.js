import React, { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { useQuery } from 'react-query';
import api from '../services/api';

const SearchFilters = ({ filters, onFilterChange }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: categoriesData } = useQuery('categories', () =>
    api.get('/api/apartments/categories/list')
  );

  const { data: locationsData } = useQuery('locations', () =>
    api.get('/api/apartments/locations/list')
  );

  const categories = categoriesData?.data?.categories || [];
  const locations = locationsData?.data?.locations || [];

  const handleInputChange = (field, value) => {
    onFilterChange({ [field]: value });
  };

  const clearFilters = () => {
    onFilterChange({
      search: '',
      category: '',
      location: '',
      minPrice: '',
      maxPrice: '',
      capacity: ''
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => 
    value && value !== '' && typeof value !== 'number'
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Search & Filters</h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <Filter className="h-4 w-4" />
          <span>{isExpanded ? 'Hide' : 'Show'} filters</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search apartments..."
          value={filters.search}
          onChange={(e) => handleInputChange('search', e.target.value)}
          className="input pl-10"
        />
      </div>

      {/* Filters */}
      {isExpanded && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={filters.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="input"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <select
                value={filters.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                className="input"
              >
                <option value="">All Locations</option>
                {locations.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </div>

            {/* Min Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Price
              </label>
              <input
                type="number"
                placeholder="Min price"
                value={filters.minPrice}
                onChange={(e) => handleInputChange('minPrice', e.target.value)}
                className="input"
              />
            </div>

            {/* Max Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Price
              </label>
              <input
                type="number"
                placeholder="Max price"
                value={filters.maxPrice}
                onChange={(e) => handleInputChange('maxPrice', e.target.value)}
                className="input"
              />
            </div>
          </div>

          {/* Capacity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Capacity
            </label>
            <select
              value={filters.capacity}
              onChange={(e) => handleInputChange('capacity', e.target.value)}
              className="input max-w-xs"
            >
              <option value="">Any capacity</option>
              <option value="1">1+ guests</option>
              <option value="2">2+ guests</option>
              <option value="4">4+ guests</option>
              <option value="6">6+ guests</option>
              <option value="8">8+ guests</option>
            </select>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <div className="flex justify-end">
              <button
                onClick={clearFilters}
                className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900"
              >
                <X className="h-4 w-4" />
                <span>Clear all filters</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchFilters; 