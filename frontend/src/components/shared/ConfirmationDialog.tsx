/**
 * Confirmation Dialog Component
 */
import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { Button } from '../ui/button';
import { AlertTriangle, Info, HelpCircle, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel?: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive' | 'warning' | 'info';
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

const variantConfig = {
  default: {
    icon: HelpCircle,
    iconColor: 'text-blue-500',
    confirmVariant: 'default' as const,
  },
  destructive: {
    icon: Trash2,
    iconColor: 'text-red-500',
    confirmVariant: 'destructive' as const,
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-yellow-500',
    confirmVariant: 'default' as const,
  },
  info: {
    icon: Info,
    iconColor: 'text-blue-500',
    confirmVariant: 'default' as const,
  },
};

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  loading = false,
  disabled = false,
  className,
}) => {
  const config = variantConfig[variant];
  const Icon = config.icon;

  const handleConfirm = () => {
    if (!loading && !disabled) {
      onConfirm();
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className={cn("sm:max-w-md", className)}>
        <AlertDialogHeader>
          <div className="flex items-center space-x-3">
            <div className={cn("flex-shrink-0", config.iconColor)}>
              <Icon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <AlertDialogTitle className="text-lg font-semibold">
                {title}
              </AlertDialogTitle>
            </div>
          </div>
          <AlertDialogDescription className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter className="mt-6">
          <AlertDialogCancel
            onClick={handleCancel}
            disabled={loading}
            className="mr-2"
          >
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading || disabled}
            className={cn(
              "min-w-[80px]",
              variant === 'destructive' && "bg-red-600 hover:bg-red-700"
            )}
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                <span>Processing...</span>
              </div>
            ) : (
              confirmText
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

// Hook for easy usage
export const useConfirmation = () => {
  const [state, setState] = React.useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm?: () => void;
    variant?: 'default' | 'destructive' | 'warning' | 'info';
    loading?: boolean;
  }>({
    open: false,
    title: '',
    description: '',
  });

  const confirm = React.useCallback((options: {
    title: string;
    description: string;
    onConfirm: () => void;
    variant?: 'default' | 'destructive' | 'warning' | 'info';
    loading?: boolean;
  }) => {
    setState({
      open: true,
      title: options.title,
      description: options.description,
      onConfirm: options.onConfirm,
      variant: options.variant || 'default',
      loading: options.loading || false,
    });
  }, []);

  const cancel = React.useCallback(() => {
    setState(prev => ({ ...prev, open: false }));
  }, []);

  const setLoading = React.useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, loading }));
  }, []);

  const ConfirmationDialogComponent = React.useMemo(() => (
    <ConfirmationDialog
      open={state.open}
      onOpenChange={(open) => {
        if (!open) cancel();
      }}
      onConfirm={() => {
        if (state.onConfirm) {
          state.onConfirm();
        }
        cancel();
      }}
      title={state.title}
      description={state.description}
      variant={state.variant}
      loading={state.loading}
    />
  ), [state, cancel]);

  return {
    confirm,
    cancel,
    setLoading,
    ConfirmationDialog: ConfirmationDialogComponent,
  };
};

export default ConfirmationDialog;
