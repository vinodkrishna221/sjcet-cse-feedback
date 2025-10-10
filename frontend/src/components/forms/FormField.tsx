/**
 * Reusable form field component with validation
 */
import React from 'react';
import { FieldError, FieldPath, FieldValues, UseFormRegister } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertCircle } from 'lucide-react';

interface FormFieldProps<T extends FieldValues> {
  name: FieldPath<T>;
  label: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'date' | 'textarea' | 'select' | 'checkbox' | 'radio';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  error?: FieldError;
  register: UseFormRegister<T>;
  options?: Array<{ value: string; label: string }>;
  rows?: number;
  min?: number;
  max?: number;
  step?: number;
  pattern?: string;
  autoComplete?: string;
  description?: string;
}

export function FormField<T extends FieldValues>({
  name,
  label,
  type = 'text',
  placeholder,
  required = false,
  disabled = false,
  className,
  error,
  register,
  options = [],
  rows = 3,
  min,
  max,
  step,
  pattern,
  autoComplete,
  description,
}: FormFieldProps<T>) {
  const fieldId = `field-${name}`;
  const errorId = `error-${name}`;

  const renderField = () => {
    const commonProps = {
      id: fieldId,
      placeholder,
      disabled,
      className: cn(
        error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
        className
      ),
      'aria-invalid': !!error,
      'aria-describedby': error ? errorId : description ? `${fieldId}-description` : undefined,
    };

    switch (type) {
      case 'textarea':
        return (
          <Textarea
            {...register(name)}
            {...commonProps}
            rows={rows}
          />
        );

      case 'select':
        return (
          <Select {...register(name)}>
            <SelectTrigger {...commonProps}>
              <SelectValue placeholder={placeholder || `Select ${label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={fieldId}
              {...register(name)}
              disabled={disabled}
              className={cn(
                error && 'border-red-500',
                className
              )}
            />
            <Label htmlFor={fieldId} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {label}
            </Label>
          </div>
        );

      case 'radio':
        return (
          <RadioGroup {...register(name)}>
            {options.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={`${fieldId}-${option.value}`} />
                <Label htmlFor={`${fieldId}-${option.value}`}>{option.label}</Label>
              </div>
            ))}
          </RadioGroup>
        );

      default:
        return (
          <Input
            {...register(name)}
            {...commonProps}
            type={type}
            min={min}
            max={max}
            step={step}
            pattern={pattern}
            autoComplete={autoComplete}
          />
        );
    }
  };

  return (
    <div className="space-y-2">
      {type !== 'checkbox' && (
        <Label htmlFor={fieldId} className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      
      {description && (
        <p id={`${fieldId}-description`} className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
      
      {renderField()}
      
      {error && (
        <div id={errorId} className="flex items-center space-x-1 text-sm text-red-500">
          <AlertCircle className="h-4 w-4" />
          <span>{error.message}</span>
        </div>
      )}
    </div>
  );
}
