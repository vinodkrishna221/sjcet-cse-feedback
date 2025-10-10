/**
 * Shared Components Library
 * Export all shared components for easy importing
 */

// Data Display
export { default as DataTable, createSortableColumn, createStatusColumn } from './DataTable';
export { default as LoadingSkeleton, Skeleton, CardSkeleton, TableSkeleton, ListSkeleton, DashboardSkeleton, FormSkeleton, ProfileSkeleton } from './LoadingSkeleton';

// Forms and Inputs
export { default as SearchAndFilter, type FilterOption, type SearchAndFilterProps } from './SearchAndFilter';

// Feedback and Dialogs
export { default as ConfirmationDialog, useConfirmation } from './ConfirmationDialog';

// Re-export commonly used UI components
export { Button } from '../ui/button';
export { Input } from '../ui/input';
export { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
export { Badge } from '../ui/badge';
export { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
export { Checkbox } from '../ui/checkbox';
export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
export { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuTrigger, 
  DropdownMenuCheckboxItem, 
  DropdownMenuSeparator 
} from '../ui/dropdown-menu';
export { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '../ui/alert-dialog';
