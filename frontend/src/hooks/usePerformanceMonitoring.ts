/**
 * Performance monitoring hooks for frontend optimization
 */
import { useEffect, useState, useCallback, useRef } from 'react';

interface PerformanceMetrics {
  // Core Web Vitals
  lcp: number | null; // Largest Contentful Paint
  fid: number | null; // First Input Delay
  cls: number | null; // Cumulative Layout Shift
  fcp: number | null; // First Contentful Paint
  ttfb: number | null; // Time to First Byte
  
  // Custom metrics
  pageLoadTime: number;
  domContentLoaded: number;
  resourceLoadTime: number;
  memoryUsage: number;
  
  // User interactions
  clickLatency: number[];
  scrollLatency: number[];
  keyboardLatency: number[];
}

interface PerformanceConfig {
  enableCoreWebVitals: boolean;
  enableCustomMetrics: boolean;
  enableUserInteractions: boolean;
  reportInterval: number;
  maxSamples: number;
}

const defaultConfig: PerformanceConfig = {
  enableCoreWebVitals: true,
  enableCustomMetrics: true,
  enableUserInteractions: true,
  reportInterval: 30000, // 30 seconds
  maxSamples: 100,
};

/**
 * Hook for monitoring Core Web Vitals and performance metrics
 */
export const usePerformanceMonitoring = (config: Partial<PerformanceConfig> = {}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    lcp: null,
    fid: null,
    cls: null,
    fcp: null,
    ttfb: null,
    pageLoadTime: 0,
    domContentLoaded: 0,
    resourceLoadTime: 0,
    memoryUsage: 0,
    clickLatency: [],
    scrollLatency: [],
    keyboardLatency: [],
  });

  const configRef = useRef({ ...defaultConfig, ...config });
  const observerRef = useRef<PerformanceObserver | null>(null);
  const interactionStartRef = useRef<number>(0);

  // Measure Core Web Vitals
  const measureCoreWebVitals = useCallback(() => {
    if (!configRef.current.enableCoreWebVitals) return;

    // Largest Contentful Paint
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as PerformanceEntry & {
            startTime: number;
            size: number;
          };
          setMetrics(prev => ({ ...prev, lcp: lastEntry.startTime }));
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

        // First Input Delay
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            setMetrics(prev => ({ ...prev, fid: entry.processingStart - entry.startTime }));
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });

        // Cumulative Layout Shift
        const clsObserver = new PerformanceObserver((list) => {
          let clsValue = 0;
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          setMetrics(prev => ({ ...prev, cls: clsValue }));
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });

        // First Contentful Paint
        const fcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            setMetrics(prev => ({ ...prev, fcp: entry.startTime }));
          });
        });
        fcpObserver.observe({ entryTypes: ['paint'] });

        observerRef.current = lcpObserver;
      } catch (error) {
        console.warn('Performance Observer not supported:', error);
      }
    }
  }, []);

  // Measure custom metrics
  const measureCustomMetrics = useCallback(() => {
    if (!configRef.current.enableCustomMetrics) return;

    // Page load time
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      setMetrics(prev => ({
        ...prev,
        pageLoadTime: navigation.loadEventEnd - navigation.loadEventStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        ttfb: navigation.responseStart - navigation.requestStart,
      }));
    }

    // Resource load time
    const resources = performance.getEntriesByType('resource');
    const totalResourceTime = resources.reduce((total, resource) => {
      return total + (resource.responseEnd - resource.requestStart);
    }, 0);
    setMetrics(prev => ({ ...prev, resourceLoadTime: totalResourceTime }));

    // Memory usage (if available)
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      setMetrics(prev => ({ ...prev, memoryUsage: memory.usedJSHeapSize }));
    }
  }, []);

  // Measure user interactions
  const measureUserInteractions = useCallback(() => {
    if (!configRef.current.enableUserInteractions) return;

    // Click latency
    const measureClickLatency = (event: MouseEvent) => {
      const latency = performance.now() - interactionStartRef.current;
      setMetrics(prev => ({
        ...prev,
        clickLatency: [...prev.clickLatency.slice(-configRef.current.maxSamples), latency],
      }));
    };

    // Scroll latency
    const measureScrollLatency = (event: Event) => {
      const latency = performance.now() - interactionStartRef.current;
      setMetrics(prev => ({
        ...prev,
        scrollLatency: [...prev.scrollLatency.slice(-configRef.current.maxSamples), latency],
      }));
    };

    // Keyboard latency
    const measureKeyboardLatency = (event: KeyboardEvent) => {
      const latency = performance.now() - interactionStartRef.current;
      setMetrics(prev => ({
        ...prev,
        keyboardLatency: [...prev.keyboardLatency.slice(-configRef.current.maxSamples), latency],
      }));
    };

    // Track interaction start
    const trackInteractionStart = () => {
      interactionStartRef.current = performance.now();
    };

    // Add event listeners
    document.addEventListener('mousedown', trackInteractionStart);
    document.addEventListener('click', measureClickLatency);
    document.addEventListener('scroll', measureScrollLatency);
    document.addEventListener('keydown', trackInteractionStart);
    document.addEventListener('keyup', measureKeyboardLatency);

    return () => {
      document.removeEventListener('mousedown', trackInteractionStart);
      document.removeEventListener('click', measureClickLatency);
      document.removeEventListener('scroll', measureScrollLatency);
      document.removeEventListener('keydown', trackInteractionStart);
      document.removeEventListener('keyup', measureKeyboardLatency);
    };
  }, []);

  // Report metrics
  const reportMetrics = useCallback(() => {
    const reportData = {
      url: window.location.href,
      timestamp: Date.now(),
      metrics,
      userAgent: navigator.userAgent,
      connection: (navigator as any).connection?.effectiveType || 'unknown',
    };

    // Send to analytics service
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'performance_metrics', {
        custom_map: {
          lcp: metrics.lcp,
          fid: metrics.fid,
          cls: metrics.cls,
          fcp: metrics.fcp,
          page_load_time: metrics.pageLoadTime,
        },
      });
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Performance Metrics:', reportData);
    }
  }, [metrics]);

  // Initialize monitoring
  useEffect(() => {
    measureCoreWebVitals();
    measureCustomMetrics();
    const cleanupInteractions = measureUserInteractions();

    // Set up periodic reporting
    const reportInterval = setInterval(reportMetrics, configRef.current.reportInterval);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (cleanupInteractions) {
        cleanupInteractions();
      }
      clearInterval(reportInterval);
    };
  }, [measureCoreWebVitals, measureCustomMetrics, measureUserInteractions, reportMetrics]);

  // Get performance score
  const getPerformanceScore = useCallback(() => {
    let score = 100;
    
    // LCP scoring (Good: <2.5s, Needs Improvement: 2.5-4s, Poor: >4s)
    if (metrics.lcp !== null) {
      if (metrics.lcp > 4000) score -= 30;
      else if (metrics.lcp > 2500) score -= 15;
    }
    
    // FID scoring (Good: <100ms, Needs Improvement: 100-300ms, Poor: >300ms)
    if (metrics.fid !== null) {
      if (metrics.fid > 300) score -= 25;
      else if (metrics.fid > 100) score -= 10;
    }
    
    // CLS scoring (Good: <0.1, Needs Improvement: 0.1-0.25, Poor: >0.25)
    if (metrics.cls !== null) {
      if (metrics.cls > 0.25) score -= 25;
      else if (metrics.cls > 0.1) score -= 10;
    }
    
    return Math.max(0, score);
  }, [metrics]);

  // Get recommendations
  const getRecommendations = useCallback(() => {
    const recommendations: string[] = [];
    
    if (metrics.lcp && metrics.lcp > 2500) {
      recommendations.push('Optimize Largest Contentful Paint by reducing image sizes and improving server response times');
    }
    
    if (metrics.fid && metrics.fid > 100) {
      recommendations.push('Reduce First Input Delay by minimizing JavaScript execution time');
    }
    
    if (metrics.cls && metrics.cls > 0.1) {
      recommendations.push('Improve Cumulative Layout Shift by setting dimensions for images and avoiding dynamic content insertion');
    }
    
    if (metrics.pageLoadTime > 3000) {
      recommendations.push('Optimize page load time by reducing bundle size and implementing code splitting');
    }
    
    return recommendations;
  }, [metrics]);

  return {
    metrics,
    performanceScore: getPerformanceScore(),
    recommendations: getRecommendations(),
    reportMetrics,
  };
};

/**
 * Hook for monitoring component render performance
 */
export const useRenderPerformance = (componentName: string) => {
  const renderStartRef = useRef<number>(0);
  const renderCountRef = useRef<number>(0);

  useEffect(() => {
    renderStartRef.current = performance.now();
    renderCountRef.current += 1;

    return () => {
      const renderTime = performance.now() - renderStartRef.current;
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`${componentName} render #${renderCountRef.current}: ${renderTime.toFixed(2)}ms`);
      }
    };
  });

  return {
    renderCount: renderCountRef.current,
  };
};

/**
 * Hook for monitoring memory usage
 */
export const useMemoryMonitoring = () => {
  const [memoryInfo, setMemoryInfo] = useState<{
    used: number;
    total: number;
    limit: number;
  } | null>(null);

  useEffect(() => {
    const updateMemoryInfo = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setMemoryInfo({
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit,
        });
      }
    };

    updateMemoryInfo();
    const interval = setInterval(updateMemoryInfo, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return memoryInfo;
};

/**
 * Hook for monitoring network performance
 */
export const useNetworkMonitoring = () => {
  const [networkInfo, setNetworkInfo] = useState<{
    effectiveType: string;
    downlink: number;
    rtt: number;
  } | null>(null);

  useEffect(() => {
    const updateNetworkInfo = () => {
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        setNetworkInfo({
          effectiveType: connection.effectiveType || 'unknown',
          downlink: connection.downlink || 0,
          rtt: connection.rtt || 0,
        });
      }
    };

    updateNetworkInfo();
    
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection.addEventListener('change', updateNetworkInfo);
      
      return () => {
        connection.removeEventListener('change', updateNetworkInfo);
      };
    }
  }, []);

  return networkInfo;
};
