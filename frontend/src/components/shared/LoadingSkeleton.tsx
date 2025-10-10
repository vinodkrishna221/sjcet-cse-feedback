/**
 * Loading Skeleton Components
 */
import React from 'react';
import { cn } from '../../lib/utils';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, ...props }) => {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-gray-200 dark:bg-gray-700",
        className
      )}
      {...props}
    />
  );
};

export const CardSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("rounded-lg border p-6 space-y-4", className)}>
    <div className="flex items-center space-x-4">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-[200px]" />
        <Skeleton className="h-4 w-[160px]" />
      </div>
    </div>
    <div className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-[80%]" />
    </div>
  </div>
);

export const TableSkeleton: React.FC<{ 
  rows?: number; 
  columns?: number; 
  className?: string;
}> = ({ rows = 5, columns = 4, className }) => (
  <div className={cn("space-y-4", className)}>
    {/* Header */}
    <div className="flex items-center justify-between">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-10 w-32" />
    </div>
    
    {/* Table */}
    <div className="rounded-md border">
      <div className="border-b p-4">
        <div className="flex space-x-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-24" />
          ))}
        </div>
      </div>
      
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="border-b p-4 last:border-b-0">
          <div className="flex space-x-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton key={colIndex} className="h-4 w-24" />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const ListSkeleton: React.FC<{ 
  items?: number; 
  className?: string;
}> = ({ items = 5, className }) => (
  <div className={cn("space-y-3", className)}>
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-[200px]" />
          <Skeleton className="h-3 w-[120px]" />
        </div>
        <Skeleton className="h-8 w-16" />
      </div>
    ))}
  </div>
);

export const DashboardSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("space-y-6", className)}>
    {/* Stats Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
    
    {/* Charts */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="rounded-lg border p-6">
        <Skeleton className="h-6 w-32 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
      <div className="rounded-lg border p-6">
        <Skeleton className="h-6 w-32 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
    
    {/* Table */}
    <TableSkeleton />
  </div>
);

export const FormSkeleton: React.FC<{ fields?: number; className?: string }> = ({ 
  fields = 5, 
  className 
}) => (
  <div className={cn("space-y-6", className)}>
    {Array.from({ length: fields }).map((_, i) => (
      <div key={i} className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
    ))}
    <div className="flex space-x-4">
      <Skeleton className="h-10 w-24" />
      <Skeleton className="h-10 w-24" />
    </div>
  </div>
);

export const ProfileSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("space-y-6", className)}>
    <div className="flex items-center space-x-6">
      <Skeleton className="h-20 w-20 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-40" />
      </div>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  </div>
);

export default Skeleton;
