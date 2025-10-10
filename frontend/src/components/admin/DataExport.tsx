/**
 * Data export component with filters and multiple formats
 */
import React, { useState, useCallback } from 'react';
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
  Download, 
  FileText, 
  FileSpreadsheet, 
  FileImage,
  Filter,
  Settings,
  RefreshCw,
  Calendar,
  Database,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface ExportField {
  field: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'boolean';
  required?: boolean;
}

interface ExportFilter {
  field: string;
  operator: string;
  value: any;
}

interface ExportOptions {
  format: 'csv' | 'xlsx' | 'json' | 'pdf';
  fields: string[];
  filters: ExportFilter[];
  dateRange?: {
    start: string;
    end: string;
  };
  includeHeaders: boolean;
  compression: boolean;
  batchSize: number;
}

interface DataExportProps {
  entityType: 'students' | 'faculty' | 'admins' | 'feedback' | 'reports';
  availableFields: ExportField[];
  onExport: (options: ExportOptions) => Promise<void>;
  onGetExportHistory?: () => Promise<ExportHistory[]>;
  isLoading?: boolean;
}

interface ExportHistory {
  id: string;
  entity_type: string;
  format: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  completed_at?: string;
  file_size?: number;
  download_url?: string;
  error_message?: string;
  created_by: string;
}

const EXPORT_FORMATS = [
  { value: 'csv', label: 'CSV', icon: FileSpreadsheet, description: 'Comma-separated values' },
  { value: 'xlsx', label: 'Excel', icon: FileSpreadsheet, description: 'Excel spreadsheet' },
  { value: 'json', label: 'JSON', icon: FileText, description: 'JSON data format' },
  { value: 'pdf', label: 'PDF', icon: FileImage, description: 'PDF report' }
];

const FILTER_OPERATORS = {
  text: ['equals', 'contains', 'starts_with', 'ends_with', 'is_empty'],
  number: ['equals', 'greater_than', 'less_than', 'between'],
  date: ['equals', 'after', 'before', 'between'],
  boolean: ['equals']
};

export function DataExport({
  entityType,
  availableFields,
  onExport,
  onGetExportHistory,
  isLoading = false
}: DataExportProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'export' | 'history'>('export');
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'csv',
    fields: availableFields.filter(f => f.required).map(f => f.field),
    filters: [],
    includeHeaders: true,
    compression: false,
    batchSize: 1000
  });
  const [selectedFields, setSelectedFields] = useState<string[]>(
    availableFields.filter(f => f.required).map(f => f.field)
  );
  const [exportHistory, setExportHistory] = useState<ExportHistory[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Handle field selection
  const handleFieldToggle = useCallback((field: string, checked: boolean) => {
    if (checked) {
      setSelectedFields([...selectedFields, field]);
    } else {
      setSelectedFields(selectedFields.filter(f => f !== field));
    }
  }, [selectedFields]);

  // Handle select all fields
  const handleSelectAllFields = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedFields(availableFields.map(f => f.field));
    } else {
      setSelectedFields([]);
    }
  }, [availableFields]);

  // Add filter
  const addFilter = useCallback(() => {
    const newFilter: ExportFilter = {
      field: availableFields[0]?.field || '',
      operator: 'equals',
      value: ''
    };
    setExportOptions(prev => ({
      ...prev,
      filters: [...prev.filters, newFilter]
    }));
  }, [availableFields]);

  // Remove filter
  const removeFilter = useCallback((index: number) => {
    setExportOptions(prev => ({
      ...prev,
      filters: prev.filters.filter((_, i) => i !== index)
    }));
  }, []);

  // Update filter
  const updateFilter = useCallback((index: number, updates: Partial<ExportFilter>) => {
    setExportOptions(prev => ({
      ...prev,
      filters: prev.filters.map((filter, i) => 
        i === index ? { ...filter, ...updates } : filter
      )
    }));
  }, []);

  // Handle export
  const handleExport = useCallback(async () => {
    if (selectedFields.length === 0) {
      toast({
        title: 'No Fields Selected',
        description: 'Please select at least one field to export.',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);
    try {
      await onExport({
        ...exportOptions,
        fields: selectedFields
      });
      
      toast({
        title: 'Export Started',
        description: `Data export in ${exportOptions.format.toUpperCase()} format has been initiated.`,
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to start data export. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  }, [exportOptions, selectedFields, onExport, toast]);

  // Load export history
  const loadExportHistory = useCallback(async () => {
    if (!onGetExportHistory) return;
    
    setIsLoadingHistory(true);
    try {
      const history = await onGetExportHistory();
      setExportHistory(history);
    } catch (error) {
      toast({
        title: 'Failed to Load History',
        description: 'Could not load export history.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingHistory(false);
    }
  }, [onGetExportHistory, toast]);

  // Get format icon
  const getFormatIcon = (format: string) => {
    const formatConfig = EXPORT_FORMATS.find(f => f.value === format);
    return formatConfig?.icon || FileText;
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Data Export</h2>
          <p className="text-muted-foreground">
            Export {entityType} data in various formats
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => setActiveTab('history')}>
            <Database className="h-4 w-4 mr-2" />
            Export History
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList>
          <TabsTrigger value="export">Export Data</TabsTrigger>
          <TabsTrigger value="history">Export History</TabsTrigger>
        </TabsList>

        {/* Export Tab */}
        <TabsContent value="export" className="space-y-4">
          {/* Export Format */}
          <Card>
            <CardHeader>
              <CardTitle>Export Format</CardTitle>
              <CardDescription>
                Choose the format for your data export
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {EXPORT_FORMATS.map(format => {
                  const FormatIcon = format.icon;
                  return (
                    <Button
                      key={format.value}
                      variant={exportOptions.format === format.value ? 'default' : 'outline'}
                      className="h-auto p-4 flex flex-col items-center space-y-2"
                      onClick={() => setExportOptions(prev => ({ ...prev, format: format.value as any }))}
                    >
                      <FormatIcon className="h-6 w-6" />
                      <div className="text-center">
                        <div className="font-medium">{format.label}</div>
                        <div className="text-xs text-muted-foreground">{format.description}</div>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Field Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Fields</CardTitle>
              <CardDescription>
                Choose which fields to include in the export
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all"
                  checked={selectedFields.length === availableFields.length}
                  onCheckedChange={handleSelectAllFields}
                />
                <Label htmlFor="select-all" className="font-medium">
                  Select All Fields
                </Label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {availableFields.map(field => (
                  <div key={field.field} className="flex items-center space-x-2">
                    <Checkbox
                      id={field.field}
                      checked={selectedFields.includes(field.field)}
                      onCheckedChange={(checked) => handleFieldToggle(field.field, checked as boolean)}
                    />
                    <Label htmlFor={field.field} className="text-sm">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                  </div>
                ))}
              </div>

              <div className="text-sm text-muted-foreground">
                {selectedFields.length} of {availableFields.length} fields selected
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Filter className="h-5 w-5" />
                <span>Filters</span>
              </CardTitle>
              <CardDescription>
                Apply filters to limit the exported data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {exportOptions.filters.map((filter, index) => (
                <div key={index} className="flex items-center space-x-2 p-3 border rounded-md">
                  <Select
                    value={filter.field}
                    onValueChange={(value) => updateFilter(index, { field: value })}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFields.map(field => (
                        <SelectItem key={field.field} value={field.field}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={filter.operator}
                    onValueChange={(value) => updateFilter(index, { operator: value })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FILTER_OPERATORS[availableFields.find(f => f.field === filter.field)?.type || 'text'].map(op => (
                        <SelectItem key={op} value={op}>
                          {op.replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    placeholder="Value"
                    value={filter.value || ''}
                    onChange={(e) => updateFilter(index, { value: e.target.value })}
                    className="flex-1"
                  />

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeFilter(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <Button variant="outline" onClick={addFilter}>
                <Plus className="h-4 w-4 mr-2" />
                Add Filter
              </Button>
            </CardContent>
          </Card>

          {/* Export Options */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Export Options</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-headers"
                    checked={exportOptions.includeHeaders}
                    onCheckedChange={(checked) => setExportOptions(prev => ({ ...prev, includeHeaders: checked as boolean }))}
                  />
                  <Label htmlFor="include-headers">Include Headers</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="compression"
                    checked={exportOptions.compression}
                    onCheckedChange={(checked) => setExportOptions(prev => ({ ...prev, compression: checked as boolean }))}
                  />
                  <Label htmlFor="compression">Compress Export</Label>
                </div>

                <div>
                  <Label htmlFor="batch-size">Batch Size</Label>
                  <Input
                    id="batch-size"
                    type="number"
                    min="100"
                    max="10000"
                    value={exportOptions.batchSize}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, batchSize: parseInt(e.target.value) || 1000 }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Export Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Export Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 p-4 bg-muted rounded-md">
                <div className="flex items-center justify-between">
                  <span>Format:</span>
                  <Badge variant="outline">{exportOptions.format.toUpperCase()}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Fields:</span>
                  <span>{selectedFields.length} selected</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Filters:</span>
                  <span>{exportOptions.filters.length} applied</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Headers:</span>
                  <span>{exportOptions.includeHeaders ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Compression:</span>
                  <span>{exportOptions.compression ? 'Yes' : 'No'}</span>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 mt-4">
                <Button variant="outline" onClick={() => setActiveTab('history')}>
                  View History
                </Button>
                <Button onClick={handleExport} disabled={isExporting || selectedFields.length === 0}>
                  {isExporting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Start Export
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Export History</CardTitle>
                  <CardDescription>
                    View your previous data exports
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={loadExportHistory} disabled={isLoadingHistory}>
                  <RefreshCw className={cn("h-4 w-4 mr-2", isLoadingHistory && "animate-spin")} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {exportHistory.map(exportItem => {
                  const FormatIcon = getFormatIcon(exportItem.format);
                  return (
                    <div key={exportItem.id} className="flex items-center justify-between p-3 border rounded-md">
                      <div className="flex items-center space-x-3">
                        <FormatIcon className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{exportItem.entity_type} Export</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(exportItem.created_at).toLocaleString()} • {exportItem.format.toUpperCase()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={cn("text-xs", getStatusColor(exportItem.status))}>
                          {exportItem.status}
                        </Badge>
                        {exportItem.file_size && (
                          <span className="text-xs text-muted-foreground">
                            {formatFileSize(exportItem.file_size)}
                          </span>
                        )}
                        {exportItem.download_url && exportItem.status === 'completed' && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={exportItem.download_url} download>
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
