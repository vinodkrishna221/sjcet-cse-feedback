/**
 * Accessibility components and utilities
 */
import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

// Skip link for keyboard navigation
export function SkipLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg"
    >
      {children}
    </a>
  );
}

// Focus trap for modals
export function FocusTrap({ children, active = true }: { children: React.ReactNode; active?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    const focusableElements = containerRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement?.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement?.focus();
          e.preventDefault();
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);
    firstElement?.focus();

    return () => {
      document.removeEventListener('keydown', handleTabKey);
    };
  }, [active]);

  return <div ref={containerRef}>{children}</div>;
}

// Screen reader only text
export function ScreenReaderOnly({ children }: { children: React.ReactNode }) {
  return <span className="sr-only">{children}</span>;
}

// Visually hidden but accessible
export function VisuallyHidden({ children }: { children: React.ReactNode }) {
  return (
    <span className="absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0">
      {children}
    </span>
  );
}

// ARIA live region for announcements
export function LiveRegion({ children, politeness = 'polite' }: { 
  children: React.ReactNode; 
  politeness?: 'off' | 'polite' | 'assertive';
}) {
  return (
    <div
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {children}
    </div>
  );
}

// Keyboard navigation hook
export function useKeyboardNavigation() {
  const handleKeyDown = (e: KeyboardEvent, onEnter?: () => void, onEscape?: () => void) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        onEnter?.();
        break;
      case 'Escape':
        onEscape?.();
        break;
    }
  };

  return { handleKeyDown };
}

// High contrast mode detection
export function useHighContrast() {
  const [isHighContrast, setIsHighContrast] = React.useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setIsHighContrast(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsHighContrast(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isHighContrast;
}

// Reduced motion detection
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}

// Accessible button with proper ARIA attributes
export function AccessibleButton({
  children,
  onClick,
  disabled = false,
  loading = false,
  className,
  ...props
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        className
      )}
      aria-disabled={disabled || loading}
      {...props}
    >
      {loading && <span className="sr-only">Loading...</span>}
      {children}
    </button>
  );
}
