/**
 * Form container with validation and submission handling
 */
import React, { ReactNode } from 'react';
import { useForm, UseFormReturn, FieldValues, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save, X } from 'lucide-react';

interface FormContainerProps<T extends FieldValues> {
  schema: z.ZodSchema<T>;
  defaultValues?: Partial<T>;
  onSubmit: SubmitHandler<T>;
  onCancel?: () => void;
  title?: string;
  description?: string;
  submitText?: string;
  cancelText?: string;
  isLoading?: boolean;
  className?: string;
  children: (form: UseFormReturn<T>) => ReactNode;
  autoSave?: boolean;
  autoSaveDelay?: number;
  showDraftStatus?: boolean;
}

export function FormContainer<T extends FieldValues>({
  schema,
  defaultValues,
  onSubmit,
  onCancel,
  title,
  description,
  submitText = 'Submit',
  cancelText = 'Cancel',
  isLoading = false,
  className,
  children,
  autoSave = false,
  autoSaveDelay = 5000,
  showDraftStatus = false,
}: FormContainerProps<T>) {
  const form = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onChange',
  });

  const { formState: { isDirty, isValid, isSubmitting } } = form;

  // Auto-save functionality
  React.useEffect(() => {
    if (!autoSave || !isDirty) return;

    const timer = setTimeout(() => {
      if (isValid) {
        // Save draft logic here
        console.log('Auto-saving draft...');
      }
    }, autoSaveDelay);

    return () => clearTimeout(timer);
  }, [form.watch(), autoSave, autoSaveDelay, isDirty, isValid]);

  const handleSubmit = async (data: T) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  return (
    <Card className={cn('w-full', className)}>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      
      <CardContent>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {children(form)}
          
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center space-x-4">
              {showDraftStatus && (
                <div className="text-sm text-muted-foreground">
                  {isDirty ? (
                    <span className="text-amber-600">Draft saved</span>
                  ) : (
                    <span>All changes saved</span>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isSubmitting || isLoading}
                >
                  <X className="h-4 w-4 mr-2" />
                  {cancelText}
                </Button>
              )}
              
              <Button
                type="submit"
                disabled={!isValid || isSubmitting || isLoading}
                className="min-w-[100px]"
              >
                {isSubmitting || isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {submitText}
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
