/**
 * LazyImage component for optimized image loading
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  fallback?: string;
  width?: number;
  height?: number;
  quality?: number;
  priority?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className,
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PC9zdmc+',
  fallback = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZWY0NDQ0Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iI2ZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkVycm9yPC90ZXh0Pjwvc3ZnPg==',
  width,
  height,
  quality = 80,
  priority = false,
  onLoad,
  onError,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [currentSrc, setCurrentSrc] = useState(placeholder);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Generate optimized image URL
  const getOptimizedSrc = useCallback((originalSrc: string) => {
    if (!originalSrc || originalSrc.startsWith('data:')) {
      return originalSrc;
    }

    // Add image optimization parameters
    const url = new URL(originalSrc, window.location.origin);
    
    if (width) url.searchParams.set('w', width.toString());
    if (height) url.searchParams.set('h', height.toString());
    if (quality) url.searchParams.set('q', quality.toString());
    url.searchParams.set('f', 'webp'); // Prefer WebP format
    
    return url.toString();
  }, [width, height, quality]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || !imgRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observerRef.current?.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before the image comes into view
        threshold: 0.1,
      }
    );

    observerRef.current.observe(imgRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [priority]);

  // Load image when in view
  useEffect(() => {
    if (!isInView) return;

    const optimizedSrc = getOptimizedSrc(src);
    setCurrentSrc(optimizedSrc);
  }, [isInView, src, getOptimizedSrc]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    setIsError(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setIsError(true);
    setCurrentSrc(fallback);
    onError?.();
  }, [fallback, onError]);

  return (
    <div
      ref={imgRef}
      className={cn(
        'relative overflow-hidden bg-gray-100',
        className
      )}
      style={{ width, height }}
    >
      <img
        src={currentSrc}
        alt={alt}
        className={cn(
          'transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0'
        )}
        onLoad={handleLoad}
        onError={handleError}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
      
      {/* Loading placeholder */}
      {!isLoaded && !isError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="animate-pulse">
            <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
          </div>
        </div>
      )}
      
      {/* Error state */}
      {isError && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-100">
          <div className="text-red-500 text-sm">Failed to load</div>
        </div>
      )}
    </div>
  );
};

/**
 * ImageGallery component for displaying multiple lazy-loaded images
 */
interface ImageGalleryProps {
  images: Array<{
    src: string;
    alt: string;
    thumbnail?: string;
  }>;
  className?: string;
  columns?: number;
  gap?: number;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  className,
  columns = 3,
  gap = 16,
}) => {
  return (
    <div
      className={cn('grid', className)}
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: `${gap}px`,
      }}
    >
      {images.map((image, index) => (
        <LazyImage
          key={index}
          src={image.src}
          alt={image.alt}
          placeholder={image.thumbnail}
          priority={index < 6} // Load first 6 images with priority
        />
      ))}
    </div>
  );
};

/**
 * ResponsiveImage component that adapts to different screen sizes
 */
interface ResponsiveImageProps extends Omit<LazyImageProps, 'width' | 'height'> {
  sizes?: string;
  breakpoints?: Record<string, { width: number; height: number }>;
}

export const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
  sizes = '100vw',
  breakpoints = {
    mobile: { width: 400, height: 300 },
    tablet: { width: 800, height: 600 },
    desktop: { width: 1200, height: 900 },
  },
  ...props
}) => {
  const [currentBreakpoint, setCurrentBreakpoint] = useState('desktop');

  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setCurrentBreakpoint('mobile');
      } else if (width < 1024) {
        setCurrentBreakpoint('tablet');
      } else {
        setCurrentBreakpoint('desktop');
      }
    };

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  const currentSize = breakpoints[currentBreakpoint];

  return (
    <LazyImage
      {...props}
      width={currentSize.width}
      height={currentSize.height}
    />
  );
};

/**
 * ProgressiveImage component that loads low-quality image first, then high-quality
 */
interface ProgressiveImageProps extends LazyImageProps {
  lowQualitySrc: string;
  highQualitySrc: string;
}

export const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  lowQualitySrc,
  highQualitySrc,
  ...props
}) => {
  const [isHighQualityLoaded, setIsHighQualityLoaded] = useState(false);

  return (
    <div className="relative">
      {/* Low quality image */}
      <LazyImage
        {...props}
        src={lowQualitySrc}
        className={cn(
          'blur-sm transition-opacity duration-300',
          isHighQualityLoaded ? 'opacity-0' : 'opacity-100'
        )}
      />
      
      {/* High quality image */}
      <LazyImage
        {...props}
        src={highQualitySrc}
        className={cn(
          'absolute inset-0 transition-opacity duration-300',
          isHighQualityLoaded ? 'opacity-100' : 'opacity-0'
        )}
        onLoad={() => setIsHighQualityLoaded(true)}
      />
    </div>
  );
};
