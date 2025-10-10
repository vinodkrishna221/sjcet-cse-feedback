/**
 * Bulk edit component for managing multiple records
 */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Edit, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Search,
  Filter,
  Save,
  RefreshCw,
  Trash2,
  Plus,
  Minus,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface BulkEditProps {
  entityType: 'students' | 'faculty' | 'admins';
  data: any[];
  onUpdate: (updates: BulkUpdate[]) => Promise<BulkUpdateResult>;
  onDelete: (ids: string[]) => Promise<BulkDeleteResult>;
  onRefresh: () => void;
  isLoading?: boolean;
  searchFields?: string[];
  filterFields?: string[];
}

interface BulkUpdate {
  id: string;
  changes: Record<string, any>;
  original: Record<string, any>;
}

interface BulkUpdateResult {
  success: boolean;
  updated: number;
  failed: number;
  errors: Array<{ id: string; message: string }>;
}

interface BulkDeleteResult {
  success: boolean;
  deleted: number;
  failed: number;
  errors: Array<{ id: string; message: string }>;
}

interface EditField {
  field: string;
  label: string;
  type: 'text' | 'select' | 'checkbox' | 'number';
  options?: string[];
  required?: boolean;
}

const ENTITY_FIELDS = {
  students: [
    { field: 'name', label: 'Name', type: 'text' as const, required: true },
    { field: 'reg_number', label: 'Registration Number', type: 'text' as const, required: true },
    { field: 'section', label: 'Section', type: 'select' as const, options: ['A', 'B'], required: true },
    { field: 'department', label: 'Department', type: 'select' as const, options: ['CSE', 'ECE', 'EEE', 'ME', 'CE'], required: true },
    { field: 'batch_year', label: 'Batch Year', type: 'number' as const, required: true },
    { field: 'email', label: 'Email', type: 'text' as const },
    { field: 'phone', label: 'Phone', type: 'text' as const },
    { field: 'address', label: 'Address', type: 'text' as const }
  ],
  faculty: [
    { field: 'name', label: 'Name', type: 'text' as const, required: true },
    { field: 'employee_id', label: 'Employee ID', type: 'text' as const, required: true },
    { field: 'department', label: 'Department', type: 'select' as const, options: ['CSE', 'ECE', 'EEE', 'ME', 'CE'], required: true },
    { field: 'subjects', label: 'Subjects', type: 'text' as const, required: true },
    { field: 'email', label: 'Email', type: 'text' as const },
    { field: 'phone', label: 'Phone', type: 'text' as const },
    { field: 'qualification', label: 'Qualification', type: 'text' as const },
    { field: 'experience', label: 'Experience (years)', type: 'number' as const }
  ],
  admins: [
    { field: 'name', label: 'Name', type: 'text' as const, required: true },
    { field: 'email', label: 'Email', type: 'text' as const, required: true },
    { field: 'role', label: 'Role', type: 'select' as const, options: ['principal', 'hod', 'admin'], required: true },
    { field: 'department', label: 'Department', type: 'select' as const, options: ['CSE', 'ECE', 'EEE', 'ME', 'CE'] },
    { field: 'phone', label: 'Phone', type: 'text' as const }
  ]
};

export function BulkEdit({
  entityType,
  data,
  onUpdate,
  onDelete,
  onRefresh,
  isLoading = false,
  searchFields = ['name', 'email'],
  filterFields = ['department', 'section', 'role']
}: BulkEditProps) {
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<any>('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'delete'>('edit');

  const fields = ENTITY_FIELDS[entityType];

  // Filter and search data
  const filteredData = data.filter(item => {
    // Search filter
    if (searchTerm) {
      const searchMatch = searchFields.some(field => 
        item[field]?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (!searchMatch) return false;
    }

    // Field filters
    for (const [field, value] of Object.entries(filters)) {
      if (value && item[field] !== value) return false;
    }

    return true;
  });

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredData.map(item => item.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  // Handle individual selection
  const handleSelectItem = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  // Start editing field
  const startEditField = (field: string) => {
    setEditingField(field);
    setEditValue('');
  };

  // Apply field edit to selected items
  const applyFieldEdit = async () => {
    if (!editingField || selectedIds.size === 0) return;

    const updates: BulkUpdate[] = Array.from(selectedIds).map(id => {
      const item = data.find(d => d.id === id);
      if (!item) return null;

      return {
        id,
        changes: { [editingField]: editValue },
        original: { ...item }
      };
    }).filter(Boolean) as BulkUpdate[];

    setIsUpdating(true);
    try {
      const result = await onUpdate(updates);
      
      if (result.success) {
        toast({
          title: 'Update Successful',
          description: `Successfully updated ${result.updated} records.`,
        });
        setEditingField(null);
        setEditValue('');
        setSelectedIds(new Set());
        onRefresh();
      } else {
        toast({
          title: 'Update Failed',
          description: `Failed to update ${result.failed} records.`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Update Error',
        description: 'An error occurred during update. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    setIsDeleting(true);
    try {
      const result = await onDelete(Array.from(selectedIds));
      
      if (result.success) {
        toast({
          title: 'Delete Successful',
          description: `Successfully deleted ${result.deleted} records.`,
        });
        setSelectedIds(new Set());
        setShowDeleteConfirm(false);
        onRefresh();
      } else {
        toast({
          title: 'Delete Failed',
          description: `Failed to delete ${result.failed} records.`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Delete Error',
        description: 'An error occurred during deletion. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
  };

  // Get field component
  const getFieldComponent = (field: EditField) => {
    switch (field.type) {
      case 'select':
        return (
          <Select value={editValue} onValueChange={setEditValue}>
            <SelectTrigger>
              <SelectValue placeholder={`Select ${field.label}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map(option => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'checkbox':
        return (
          <Checkbox
            checked={editValue}
            onCheckedChange={setEditValue}
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(parseInt(e.target.value) || 0)}
            placeholder={`Enter ${field.label}`}
          />
        );
      default:
        return (
          <Input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder={`Enter ${field.label}`}
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Bulk Edit {entityType.charAt(0).toUpperCase() + entityType.slice(1)}</h2>
          <p className="text-muted-foreground">
            Edit multiple records at once with bulk operations
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
          <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Search & Filter</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search records..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {filterFields.map(field => {
              const fieldConfig = fields.find(f => f.field === field);
              if (!fieldConfig) return null;

              return (
                <div key={field}>
                  <Label htmlFor={field}>{fieldConfig.label}</Label>
                  {fieldConfig.type === 'select' ? (
                    <Select
                      value={filters[field] || ''}
                      onValueChange={(value) => setFilters({ ...filters, [field]: value || '' })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`All ${fieldConfig.label}`} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All {fieldConfig.label}</SelectItem>
                        {fieldConfig.options?.map(option => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      placeholder={`Filter by ${fieldConfig.label}`}
                      value={filters[field] || ''}
                      onChange={(e) => setFilters({ ...filters, [field]: e.target.value })}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {filteredData.length} of {data.length} records
            </div>
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Operations */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList>
          <TabsTrigger value="edit">Bulk Edit</TabsTrigger>
          <TabsTrigger value="delete">Bulk Delete</TabsTrigger>
        </TabsList>

        {/* Bulk Edit Tab */}
        <TabsContent value="edit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Edit className="h-5 w-5" />
                <span>Bulk Edit Operations</span>
              </CardTitle>
              <CardDescription>
                Select records and edit fields in bulk
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Selection Controls */}
              <div className="flex items-center justify-between p-4 bg-muted rounded-md">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedIds.size === filteredData.length && filteredData.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                    <Label>Select All ({filteredData.length})</Label>
                  </div>
                  <Badge variant="outline">
                    {selectedIds.size} selected
                  </Badge>
                </div>

                {selectedIds.size > 0 && (
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedIds(new Set())}
                    >
                      Clear Selection
                    </Button>
                  </div>
                )}
              </div>

              {/* Field Edit Controls */}
              {selectedIds.size > 0 && (
                <div className="space-y-4 p-4 border rounded-md">
                  <h4 className="font-medium">Edit Selected Records</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {fields.map(field => (
                      <div key={field.field} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                          </Label>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEditField(field.field)}
                            disabled={editingField === field.field}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>

                        {editingField === field.field && (
                          <div className="space-y-2">
                            {getFieldComponent(field)}
                            <div className="flex items-center space-x-2">
                              <Button
                                size="sm"
                                onClick={applyFieldEdit}
                                disabled={isUpdating}
                              >
                                {isUpdating ? (
                                  <>
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    Updating...
                                  </>
                                ) : (
                                  <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Apply
                                  </>
                                )}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingField(null);
                                  setEditValue('');
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bulk Delete Tab */}
        <TabsContent value="delete" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Trash2 className="h-5 w-5 text-red-500" />
                <span>Bulk Delete Operations</span>
              </CardTitle>
              <CardDescription>
                Select records to delete permanently
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Selection Controls */}
              <div className="flex items-center justify-between p-4 bg-muted rounded-md">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedIds.size === filteredData.length && filteredData.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                    <Label>Select All ({filteredData.length})</Label>
                  </div>
                  <Badge variant="outline">
                    {selectedIds.size} selected
                  </Badge>
                </div>

                {selectedIds.size > 0 && (
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedIds(new Set())}
                    >
                      Clear Selection
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Selected
                    </Button>
                  </div>
                )}
              </div>

              {selectedIds.size > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Warning:</strong> This action cannot be undone. You are about to delete {selectedIds.size} records permanently.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Records</CardTitle>
          <CardDescription>
            Click checkboxes to select records for bulk operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">
                    <Checkbox
                      checked={selectedIds.size === filteredData.length && filteredData.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  {fields.map(field => (
                    <th key={field.field} className="text-left p-2 font-medium">
                      {field.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredData.map(item => (
                  <tr key={item.id} className="border-b hover:bg-muted/50">
                    <td className="p-2">
                      <Checkbox
                        checked={selectedIds.has(item.id)}
                        onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                      />
                    </td>
                    {fields.map(field => (
                      <td key={field.field} className="p-2">
                        {item[field.field]?.toString() || '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <Card className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <span>Confirm Bulk Delete</span>
              </CardTitle>
              <CardDescription>
                This action cannot be undone. Are you sure you want to delete {selectedIds.size} records?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete {selectedIds.size} Records
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </Card>
      )}
    </div>
  );
}
