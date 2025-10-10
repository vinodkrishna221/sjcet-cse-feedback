/**
 * Advanced filter builder component
 */
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Filter, 
  Plus, 
  Minus, 
  Save, 
  Loader2,
  Search,
  Calendar,
  X,
  Settings,
  Download,
  Upload
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface FilterCondition {
  id: string;
  field: string;
  operator: string;
  value: any;
  valueType: 'text' | 'number' | 'date' | 'select' | 'boolean';
  options?: string[];
}

interface FilterGroup {
  id: string;
  conditions: FilterCondition[];
  operator: 'AND' | 'OR';
}

interface FilterPreset {
  id: string;
  name: string;
  description: string;
  groups: FilterGroup[];
  created_at: string;
  updated_at: string;
  is_public: boolean;
  created_by: string;
}

interface FilterBuilderProps {
  entityType: 'students' | 'faculty' | 'admins' | 'feedback';
  availableFields: Array<{
    field: string;
    label: string;
    type: 'text' | 'number' | 'date' | 'select' | 'boolean';
    options?: string[];
  }>;
  onApply: (filters: FilterGroup[]) => void;
  onSavePreset?: (preset: Omit<FilterPreset, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onLoadPreset?: (presetId: string) => Promise<void>;
  presets?: FilterPreset[];
  isLoading?: boolean;
}

const OPERATORS = {
  text: [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'not_contains', label: 'Not Contains' },
    { value: 'starts_with', label: 'Starts With' },
    { value: 'ends_with', label: 'Ends With' },
    { value: 'is_empty', label: 'Is Empty' },
    { value: 'is_not_empty', label: 'Is Not Empty' }
  ],
  number: [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not Equals' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
    { value: 'greater_equal', label: 'Greater or Equal' },
    { value: 'less_equal', label: 'Less or Equal' },
    { value: 'between', label: 'Between' }
  ],
  date: [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not Equals' },
    { value: 'after', label: 'After' },
    { value: 'before', label: 'Before' },
    { value: 'between', label: 'Between' },
    { value: 'last_days', label: 'Last N Days' },
    { value: 'next_days', label: 'Next N Days' }
  ],
  select: [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not Equals' },
    { value: 'in', label: 'In' },
    { value: 'not_in', label: 'Not In' }
  ],
  boolean: [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not Equals' }
  ]
};

export function FilterBuilder({
  entityType,
  availableFields,
  onApply,
  onSavePreset,
  onLoadPreset,
  presets = [],
  isLoading = false
}: FilterBuilderProps) {
  const { toast } = useToast();
  const [groups, setGroups] = useState<FilterGroup[]>([
    {
      id: 'group-1',
      conditions: [],
      operator: 'AND'
    }
  ]);
  const [activeTab, setActiveTab] = useState<'builder' | 'presets'>('builder');
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Add new condition to group
  const addCondition = useCallback((groupId: string) => {
    const newCondition: FilterCondition = {
      id: `condition-${Date.now()}`,
      field: availableFields[0]?.field || '',
      operator: 'equals',
      value: '',
      valueType: availableFields[0]?.type || 'text',
      options: availableFields[0]?.options
    };

    setGroups(prev => prev.map(group => 
      group.id === groupId 
        ? { ...group, conditions: [...group.conditions, newCondition] }
        : group
    ));
  }, [availableFields]);

  // Remove condition from group
  const removeCondition = useCallback((groupId: string, conditionId: string) => {
    setGroups(prev => prev.map(group => 
      group.id === groupId 
        ? { ...group, conditions: group.conditions.filter(c => c.id !== conditionId) }
        : group
    ));
  }, []);

  // Update condition
  const updateCondition = useCallback((groupId: string, conditionId: string, updates: Partial<FilterCondition>) => {
    setGroups(prev => prev.map(group => 
      group.id === groupId 
        ? { 
            ...group, 
            conditions: group.conditions.map(c => 
              c.id === conditionId ? { ...c, ...updates } : c
            )
          }
        : group
    ));
  }, []);

  // Add new group
  const addGroup = useCallback(() => {
    const newGroup: FilterGroup = {
      id: `group-${Date.now()}`,
      conditions: [],
      operator: 'AND'
    };
    setGroups(prev => [...prev, newGroup]);
  }, []);

  // Remove group
  const removeGroup = useCallback((groupId: string) => {
    if (groups.length > 1) {
      setGroups(prev => prev.filter(g => g.id !== groupId));
    }
  }, [groups.length]);

  // Update group operator
  const updateGroupOperator = useCallback((groupId: string, operator: 'AND' | 'OR') => {
    setGroups(prev => prev.map(group => 
      group.id === groupId ? { ...group, operator } : group
    ));
  }, []);

  // Handle field change
  const handleFieldChange = useCallback((groupId: string, conditionId: string, field: string) => {
    const fieldConfig = availableFields.find(f => f.field === field);
    if (fieldConfig) {
      updateCondition(groupId, conditionId, {
        field,
        operator: OPERATORS[fieldConfig.type][0].value,
        valueType: fieldConfig.type,
        options: fieldConfig.options,
        value: fieldConfig.type === 'boolean' ? true : ''
      });
    }
  }, [availableFields, updateCondition]);

  // Handle operator change
  const handleOperatorChange = useCallback((groupId: string, conditionId: string, operator: string) => {
    updateCondition(groupId, conditionId, { operator });
  }, [updateCondition]);

  // Handle value change
  const handleValueChange = useCallback((groupId: string, conditionId: string, value: any) => {
    updateCondition(groupId, conditionId, { value });
  }, [updateCondition]);

  // Apply filters
  const handleApply = useCallback(() => {
    const validGroups = groups.filter(group => group.conditions.length > 0);
    if (validGroups.length === 0) {
      toast({
        title: 'No Filters',
        description: 'Please add at least one filter condition.',
        variant: 'destructive',
      });
      return;
    }
    onApply(validGroups);
  }, [groups, onApply, toast]);

  // Save preset
  const handleSavePreset = useCallback(async () => {
    if (!presetName.trim()) {
      toast({
        title: 'Preset Name Required',
        description: 'Please enter a name for the preset.',
        variant: 'destructive',
      });
      return;
    }

    const validGroups = groups.filter(group => group.conditions.length > 0);
    if (validGroups.length === 0) {
      toast({
        title: 'No Filters',
        description: 'Please add at least one filter condition.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSavePreset?.({
        name: presetName,
        description: presetDescription,
        groups: validGroups,
        is_public: isPublic,
        created_by: 'current_user' // In real app, get from auth context
      });
      
      toast({
        title: 'Preset Saved',
        description: 'Filter preset has been saved successfully.',
      });
      
      setPresetName('');
      setPresetDescription('');
      setIsPublic(false);
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: 'Failed to save filter preset. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [presetName, presetDescription, groups, isPublic, onSavePreset, toast]);

  // Load preset
  const handleLoadPreset = useCallback(async (presetId: string) => {
    try {
      await onLoadPreset?.(presetId);
      toast({
        title: 'Preset Loaded',
        description: 'Filter preset has been loaded successfully.',
      });
    } catch (error) {
      toast({
        title: 'Load Failed',
        description: 'Failed to load filter preset. Please try again.',
        variant: 'destructive',
      });
    }
  }, [onLoadPreset, toast]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setGroups([{
      id: 'group-1',
      conditions: [],
      operator: 'AND'
    }]);
  }, []);

  // Get value input component
  const getValueInput = (condition: FilterCondition) => {
    const { valueType, operator, options, value } = condition;

    switch (valueType) {
      case 'select':
        if (operator === 'in' || operator === 'not_in') {
          return (
            <div className="space-y-2">
              <Label>Values (comma-separated)</Label>
              <Input
                placeholder="value1, value2, value3"
                value={Array.isArray(value) ? value.join(', ') : value}
                onChange={(e) => handleValueChange(
                  condition.id.split('-')[0] + '-' + condition.id.split('-')[1], 
                  condition.id, 
                  e.target.value.split(',').map(v => v.trim())
                )}
              />
            </div>
          );
        }
        return (
          <Select value={value} onValueChange={(val) => handleValueChange(
            condition.id.split('-')[0] + '-' + condition.id.split('-')[1], 
            condition.id, 
            val
          )}>
            <SelectTrigger>
              <SelectValue placeholder="Select value" />
            </SelectTrigger>
            <SelectContent>
              {options?.map(option => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'boolean':
        return (
          <Select value={value.toString()} onValueChange={(val) => handleValueChange(
            condition.id.split('-')[0] + '-' + condition.id.split('-')[1], 
            condition.id, 
            val === 'true'
          )}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">True</SelectItem>
              <SelectItem value="false">False</SelectItem>
            </SelectContent>
          </Select>
        );

      case 'date':
        if (operator === 'between') {
          return (
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={value?.start || ''}
                onChange={(e) => handleValueChange(
                  condition.id.split('-')[0] + '-' + condition.id.split('-')[1], 
                  condition.id, 
                  { ...value, start: e.target.value }
                )}
              />
              <Label>End Date</Label>
              <Input
                type="date"
                value={value?.end || ''}
                onChange={(e) => handleValueChange(
                  condition.id.split('-')[0] + '-' + condition.id.split('-')[1], 
                  condition.id, 
                  { ...value, end: e.target.value }
                )}
              />
            </div>
          );
        }
        if (operator === 'last_days' || operator === 'next_days') {
          return (
            <div className="space-y-2">
              <Label>Number of Days</Label>
              <Input
                type="number"
                value={value || ''}
                onChange={(e) => handleValueChange(
                  condition.id.split('-')[0] + '-' + condition.id.split('-')[1], 
                  condition.id, 
                  parseInt(e.target.value) || 0
                )}
              />
            </div>
          );
        }
        return (
          <Input
            type="date"
            value={value || ''}
            onChange={(e) => handleValueChange(
              condition.id.split('-')[0] + '-' + condition.id.split('-')[1], 
              condition.id, 
              e.target.value
            )}
          />
        );

      case 'number':
        if (operator === 'between') {
          return (
            <div className="space-y-2">
              <Label>Min Value</Label>
              <Input
                type="number"
                value={value?.min || ''}
                onChange={(e) => handleValueChange(
                  condition.id.split('-')[0] + '-' + condition.id.split('-')[1], 
                  condition.id, 
                  { ...value, min: parseFloat(e.target.value) || 0 }
                )}
              />
              <Label>Max Value</Label>
              <Input
                type="number"
                value={value?.max || ''}
                onChange={(e) => handleValueChange(
                  condition.id.split('-')[0] + '-' + condition.id.split('-')[1], 
                  condition.id, 
                  { ...value, max: parseFloat(e.target.value) || 0 }
                )}
              />
            </div>
          );
        }
        return (
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => handleValueChange(
              condition.id.split('-')[0] + '-' + condition.id.split('-')[1], 
              condition.id, 
              parseFloat(e.target.value) || 0
            )}
          />
        );

      default:
        return (
          <Input
            type="text"
            value={value || ''}
            onChange={(e) => handleValueChange(
              condition.id.split('-')[0] + '-' + condition.id.split('-')[1], 
              condition.id, 
              e.target.value
            )}
            placeholder="Enter value"
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Advanced Filter Builder</h2>
          <p className="text-muted-foreground">
            Create complex filters for {entityType} data
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-2" />
            Clear All
          </Button>
          <Button size="sm" onClick={handleApply} disabled={isLoading}>
            <Filter className="h-4 w-4 mr-2" />
            Apply Filters
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList>
          <TabsTrigger value="builder">Filter Builder</TabsTrigger>
          <TabsTrigger value="presets">Saved Presets</TabsTrigger>
        </TabsList>

        {/* Filter Builder Tab */}
        <TabsContent value="builder" className="space-y-4">
          {groups.map((group, groupIndex) => (
            <Card key={group.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Filter className="h-5 w-5" />
                    <span>Filter Group {groupIndex + 1}</span>
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    {groups.length > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeGroup(group.id)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addGroup()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Group Operator */}
                <div className="flex items-center space-x-2">
                  <Label>Group Operator:</Label>
                  <Select
                    value={group.operator}
                    onValueChange={(value) => updateGroupOperator(group.id, value as 'AND' | 'OR')}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AND">AND</SelectItem>
                      <SelectItem value="OR">OR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Conditions */}
                <div className="space-y-4">
                  {group.conditions.map((condition, conditionIndex) => (
                    <div key={condition.id} className="p-4 border rounded-md space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Condition {conditionIndex + 1}</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeCondition(group.id, condition.id)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Field Selection */}
                        <div>
                          <Label>Field</Label>
                          <Select
                            value={condition.field}
                            onValueChange={(value) => handleFieldChange(group.id, condition.id, value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select field" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableFields.map(field => (
                                <SelectItem key={field.field} value={field.field}>
                                  {field.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Operator Selection */}
                        <div>
                          <Label>Operator</Label>
                          <Select
                            value={condition.operator}
                            onValueChange={(value) => handleOperatorChange(group.id, condition.id, value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select operator" />
                            </SelectTrigger>
                            <SelectContent>
                              {OPERATORS[condition.valueType]?.map(op => (
                                <SelectItem key={op.value} value={op.value}>
                                  {op.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Value Input */}
                        <div>
                          <Label>Value</Label>
                          {getValueInput(condition)}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Add Condition Button */}
                  <Button
                    variant="outline"
                    onClick={() => addCondition(group.id)}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Condition
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Presets Tab */}
        <TabsContent value="presets" className="space-y-4">
          {/* Save Current Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Save Current Filters</CardTitle>
              <CardDescription>
                Save the current filter configuration as a preset
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="preset-name">Preset Name</Label>
                  <Input
                    id="preset-name"
                    placeholder="Enter preset name"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="preset-description">Description</Label>
                  <Input
                    id="preset-description"
                    placeholder="Enter description"
                    value={presetDescription}
                    onChange={(e) => setPresetDescription(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is-public"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                />
                <Label htmlFor="is-public">Make this preset public</Label>
              </div>

              <Button onClick={handleSavePreset} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Preset
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Saved Presets */}
          <Card>
            <CardHeader>
              <CardTitle>Saved Presets</CardTitle>
              <CardDescription>
                Load previously saved filter configurations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {presets.map(preset => (
                  <div key={preset.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div>
                      <div className="font-medium">{preset.name}</div>
                      <div className="text-sm text-muted-foreground">{preset.description}</div>
                      <div className="text-xs text-muted-foreground">
                        Created by {preset.created_by} • {new Date(preset.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {preset.is_public && (
                        <Badge variant="outline">Public</Badge>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleLoadPreset(preset.id)}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Load
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
