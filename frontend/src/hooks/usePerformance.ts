/**
 * Performance monitoring hooks
 */
import { useEffect, useRef, useCallback, useState } from 'react';

export interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  memoryUsage?: number;
  networkLatency?: number;
}

export function usePerformanceMonitor(componentName: string) {
  const startTime = useRef<number>(Date.now());
  const renderStartTime = useRef<number>(0);

  useEffect(() => {
    const loadTime = Date.now() - startTime.current;
    console.log(`${componentName} loaded in ${loadTime}ms`);
    
    // Report to analytics service
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'component_load', {
        component_name: componentName,
        load_time: loadTime,
      });
    }
  }, [componentName]);

  const measureRender = useCallback((callback: () => void) => {
    renderStartTime.current = performance.now();
    callback();
    const renderTime = performance.now() - renderStartTime.current;
    console.log(`${componentName} rendered in ${renderTime.toFixed(2)}ms`);
  }, [componentName]);

  return { measureRender };
}

export function useWebVitals() {
  useEffect(() => {
    // Measure Core Web Vitals
    const measureCLS = () => {
      let clsValue = 0;
      let clsEntries: PerformanceEntry[] = [];
      
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsEntries.push(entry);
            clsValue += (entry as any).value;
          }
        }
      });
      
      observer.observe({ entryTypes: ['layout-shift'] });
      
      return () => {
        observer.disconnect();
        console.log('CLS:', clsValue);
        
        // Report to analytics
        if (typeof window !== 'undefined' && (window as any).gtag) {
          (window as any).gtag('event', 'web_vitals', {
            metric_name: 'CLS',
            metric_value: clsValue,
          });
        }
      };
    };

    const measureFID = () => {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const fid = (entry as any).processingStart - entry.startTime;
          console.log('FID:', fid);
          
          // Report to analytics
          if (typeof window !== 'undefined' && (window as any).gtag) {
            (window as any).gtag('event', 'web_vitals', {
              metric_name: 'FID',
              metric_value: fid,
            });
          }
        }
      });
      
      observer.observe({ entryTypes: ['first-input'] });
      
      return () => observer.disconnect();
    };

    const measureLCP = () => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        console.log('LCP:', lastEntry.startTime);
        
        // Report to analytics
        if (typeof window !== 'undefined' && (window as any).gtag) {
          (window as any).gtag('event', 'web_vitals', {
            metric_name: 'LCP',
            metric_value: lastEntry.startTime,
          });
        }
      });
      
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
      
      return () => observer.disconnect();
    };

    const measureFCP = () => {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            console.log('FCP:', entry.startTime);
            
            // Report to analytics
            if (typeof window !== 'undefined' && (window as any).gtag) {
              (window as any).gtag('event', 'web_vitals', {
                metric_name: 'FCP',
                metric_value: entry.startTime,
              });
            }
          }
        }
      });
      
      observer.observe({ entryTypes: ['paint'] });
      
      return () => observer.disconnect();
    };

    const measureTTFB = () => {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const ttfb = (entry as any).responseStart - (entry as any).requestStart;
            console.log('TTFB:', ttfb);
            
            // Report to analytics
            if (typeof window !== 'undefined' && (window as any).gtag) {
              (window as any).gtag('event', 'web_vitals', {
                metric_name: 'TTFB',
                metric_value: ttfb,
              });
            }
          }
        }
      });
      
      observer.observe({ entryTypes: ['navigation'] });
      
      return () => observer.disconnect();
    };

    // Start measuring
    const cleanupCLS = measureCLS();
    const cleanupFID = measureFID();
    const cleanupLCP = measureLCP();
    const cleanupFCP = measureFCP();
    const cleanupTTFB = measureTTFB();

    return () => {
      cleanupCLS();
      cleanupFID();
      cleanupLCP();
      cleanupFCP();
      cleanupTTFB();
    };
  }, []);
}

export function useMemoryUsage() {
  const [memoryInfo, setMemoryInfo] = useState<{
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  } | null>(null);

  useEffect(() => {
    const updateMemoryInfo = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setMemoryInfo({
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
        });
      }
    };

    updateMemoryInfo();
    const interval = setInterval(updateMemoryInfo, 5000);

    return () => clearInterval(interval);
  }, []);

  return memoryInfo;
}

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionType, setConnectionType] = useState<string>('unknown');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check connection type
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      setConnectionType(connection.effectiveType || 'unknown');
      
      const handleConnectionChange = () => {
        setConnectionType(connection.effectiveType || 'unknown');
      };
      
      connection.addEventListener('change', handleConnectionChange);
      
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        connection.removeEventListener('change', handleConnectionChange);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, connectionType };
}

export function useErrorReporting() {
  const reportError = useCallback((error: Error, context?: any) => {
    console.error('Error reported:', error, context);
    
    // Report to error tracking service
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'exception', {
        description: error.message,
        fatal: false,
        custom_map: context,
      });
    }
  }, []);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      reportError(new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      reportError(new Error(event.reason), {
        type: 'unhandled_promise_rejection',
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [reportError]);

  return { reportError };
}

export default usePerformanceMonitor;
