/**
 * Search and Filter Component
 */
import React, { useState, useCallback } from 'react';
import { Search, Filter, X, ChevronDown } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { cn } from '../../lib/utils';

export interface FilterOption {
  key: string;
  label: string;
  type: 'select' | 'checkbox' | 'date' | 'text';
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export interface SearchAndFilterProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters: FilterOption[];
  activeFilters: Record<string, any>;
  onFilterChange: (key: string, value: any) => void;
  onClearFilters: () => void;
  className?: string;
  showSearch?: boolean;
  showFilters?: boolean;
}

export const SearchAndFilter: React.FC<SearchAndFilterProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  filters,
  activeFilters,
  onFilterChange,
  onClearFilters,
  className,
  showSearch = true,
  showFilters = true,
}) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const activeFilterCount = Object.keys(activeFilters).filter(
    key => activeFilters[key] !== undefined && activeFilters[key] !== ''
  ).length;

  const handleFilterChange = useCallback((key: string, value: any) => {
    onFilterChange(key, value);
  }, [onFilterChange]);

  const handleClearFilters = useCallback(() => {
    onClearFilters();
    setIsFilterOpen(false);
  }, [onClearFilters]);

  const renderFilterControl = (filter: FilterOption) => {
    const value = activeFilters[filter.key];

    switch (filter.type) {
      case 'select':
        return (
          <Select
            value={value || ''}
            onValueChange={(newValue) => handleFilterChange(filter.key, newValue)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={filter.placeholder || `Select ${filter.label}`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All {filter.label}</SelectItem>
              {filter.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'checkbox':
        return (
          <div className="space-y-2">
            {filter.options?.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={`${filter.key}-${option.value}`}
                  checked={Array.isArray(value) ? value.includes(option.value) : false}
                  onChange={(e) => {
                    const currentValues = Array.isArray(value) ? value : [];
                    const newValues = e.target.checked
                      ? [...currentValues, option.value]
                      : currentValues.filter(v => v !== option.value);
                    handleFilterChange(filter.key, newValues);
                  }}
                  className="rounded border-gray-300"
                />
                <label
                  htmlFor={`${filter.key}-${option.value}`}
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  {option.label}
                </label>
              </div>
            ))}
          </div>
        );

      case 'date':
        return (
          <Input
            type="date"
            value={value || ''}
            onChange={(e) => handleFilterChange(filter.key, e.target.value)}
            placeholder={filter.placeholder}
            className="w-full"
          />
        );

      case 'text':
        return (
          <Input
            type="text"
            value={value || ''}
            onChange={(e) => handleFilterChange(filter.key, e.target.value)}
            placeholder={filter.placeholder || `Filter by ${filter.label}`}
            className="w-full"
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className={cn("flex items-center space-x-4", className)}>
      {/* Search */}
      {showSearch && (
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* Filters */}
      {showFilters && filters.length > 0 && (
        <DropdownMenu open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="relative">
              <Filter className="mr-2 h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeFilterCount}
                </Badge>
              )}
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="p-4 space-y-4">
              {filters.map((filter) => (
                <div key={filter.key} className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {filter.label}
                  </label>
                  {renderFilterControl(filter)}
                </div>
              ))}
            </div>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="w-full"
              >
                <X className="mr-2 h-4 w-4" />
                Clear all filters
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(activeFilters).map(([key, value]) => {
            if (value === undefined || value === '') return null;
            
            const filter = filters.find(f => f.key === key);
            if (!filter) return null;

            const getDisplayValue = () => {
              if (Array.isArray(value)) {
                return value.join(', ');
              }
              if (filter.type === 'select' && filter.options) {
                const option = filter.options.find(o => o.value === value);
                return option?.label || value;
              }
              return value;
            };

            return (
              <Badge
                key={key}
                variant="secondary"
                className="flex items-center space-x-1"
              >
                <span>{filter.label}: {getDisplayValue()}</span>
                <button
                  onClick={() => handleFilterChange(key, filter.type === 'checkbox' ? [] : '')}
                  className="ml-1 hover:text-red-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SearchAndFilter;
