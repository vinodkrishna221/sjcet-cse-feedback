/**
 * Audit export component for downloading audit logs
 */
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  Calendar as CalendarIcon,
  Filter,
  Settings,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface AuditExportProps {
  onExport: (options: ExportOptions) => Promise<void>;
  isLoading?: boolean;
  availableFormats?: string[];
  availableFields?: string[];
  maxDateRange?: number; // Maximum days for date range
}

interface ExportOptions {
  format: 'json' | 'csv' | 'xlsx' | 'pdf';
  dateRange: {
    start: Date;
    end: Date;
  };
  fields: string[];
  filters: {
    user_types?: string[];
    actions?: string[];
    levels?: string[];
    success?: boolean;
  };
  includeMetadata: boolean;
  compression: boolean;
  batchSize?: number;
}

const DEFAULT_FIELDS = [
  'id',
  'timestamp',
  'user_id',
  'user_type',
  'action',
  'level',
  'resource_type',
  'resource_id',
  'description',
  'success',
  'ip_address',
  'user_agent'
];

const METADATA_FIELDS = [
  'session_id',
  'tags',
  'metadata',
  'details',
  'error_message'
];

export function AuditExport({
  onExport,
  isLoading = false,
  availableFormats = ['json', 'csv', 'xlsx', 'pdf'],
  availableFields = DEFAULT_FIELDS,
  maxDateRange = 90
}: AuditExportProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ExportOptions>({
    format: 'csv',
    dateRange: {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      end: new Date()
    },
    fields: DEFAULT_FIELDS,
    filters: {},
    includeMetadata: false,
    compression: false,
    batchSize: 1000
  });

  const [selectedFields, setSelectedFields] = useState<string[]>(DEFAULT_FIELDS);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Handle field selection
  const handleFieldToggle = (field: string, checked: boolean) => {
    if (checked) {
      setSelectedFields([...selectedFields, field]);
    } else {
      setSelectedFields(selectedFields.filter(f => f !== field));
    }
  };

  // Handle select all fields
  const handleSelectAllFields = (checked: boolean) => {
    if (checked) {
      setSelectedFields(availableFields);
    } else {
      setSelectedFields([]);
    }
  };

  // Handle export
  const handleExport = async () => {
    try {
      const exportOptions = {
        ...options,
        fields: selectedFields
      };
      
      await onExport(exportOptions);
      
      toast({
        title: 'Export Started',
        description: `Audit log export in ${options.format.toUpperCase()} format has been initiated.`,
      });
      
      setIsOpen(false);
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to start audit log export. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Validate date range
  const isDateRangeValid = () => {
    const daysDiff = Math.ceil((options.dateRange.end.getTime() - options.dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff <= maxDateRange && daysDiff > 0;
  };

  // Get format icon
  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'json':
        return FileText;
      case 'csv':
        return FileSpreadsheet;
      case 'xlsx':
        return FileSpreadsheet;
      case 'pdf':
        return FileText;
      default:
        return FileText;
    }
  };

  // Get format description
  const getFormatDescription = (format: string) => {
    switch (format) {
      case 'json':
        return 'Machine-readable JSON format with full data structure';
      case 'csv':
        return 'Comma-separated values, compatible with Excel and other tools';
      case 'xlsx':
        return 'Excel format with formatting and multiple sheets';
      case 'pdf':
        return 'PDF report with charts and formatted tables';
      default:
        return '';
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" disabled={isLoading}>
          <Download className="h-4 w-4 mr-2" />
          Export Audit Log
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="end">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Export Audit Log</CardTitle>
            <CardDescription>
              Configure and download audit log data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Format Selection */}
            <div className="space-y-3">
              <Label>Export Format</Label>
              <div className="grid grid-cols-2 gap-2">
                {availableFormats.map(format => {
                  const FormatIcon = getFormatIcon(format);
                  return (
                    <Button
                      key={format}
                      variant={options.format === format ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setOptions({ ...options, format: format as any })}
                      className="justify-start"
                    >
                      <FormatIcon className="h-4 w-4 mr-2" />
                      {format.toUpperCase()}
                    </Button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {getFormatDescription(options.format)}
              </p>
            </div>

            {/* Date Range */}
            <div className="space-y-3">
              <Label>Date Range</Label>
              <div className="grid grid-cols-2 gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="justify-start">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {format(options.dateRange.start, 'MMM dd, yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={options.dateRange.start}
                      onSelect={(date) => date && setOptions({
                        ...options,
                        dateRange: { ...options.dateRange, start: date }
                      })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="justify-start">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {format(options.dateRange.end, 'MMM dd, yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={options.dateRange.end}
                      onSelect={(date) => date && setOptions({
                        ...options,
                        dateRange: { ...options.dateRange, end: date }
                      })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              {!isDateRangeValid() && (
                <p className="text-xs text-red-600">
                  Date range must be between 1 and {maxDateRange} days
                </p>
              )}
            </div>

            {/* Field Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Fields to Include</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  <Settings className="h-4 w-4 mr-1" />
                  Advanced
                </Button>
              </div>
              
              <div className="space-y-2 max-h-32 overflow-y-auto">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all"
                    checked={selectedFields.length === availableFields.length}
                    onCheckedChange={handleSelectAllFields}
                  />
                  <Label htmlFor="select-all" className="text-sm font-medium">
                    Select All
                  </Label>
                </div>
                
                {availableFields.map(field => (
                  <div key={field} className="flex items-center space-x-2">
                    <Checkbox
                      id={field}
                      checked={selectedFields.includes(field)}
                      onCheckedChange={(checked) => handleFieldToggle(field, checked as boolean)}
                    />
                    <Label htmlFor={field} className="text-sm">
                      {field.replace(/_/g, ' ')}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Advanced Options */}
            {showAdvanced && (
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-metadata"
                    checked={options.includeMetadata}
                    onCheckedChange={(checked) => setOptions({
                      ...options,
                      includeMetadata: checked as boolean
                    })}
                  />
                  <Label htmlFor="include-metadata" className="text-sm">
                    Include metadata fields
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="compression"
                    checked={options.compression}
                    onCheckedChange={(checked) => setOptions({
                      ...options,
                      compression: checked as boolean
                    })}
                  />
                  <Label htmlFor="compression" className="text-sm">
                    Compress export file
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="batch-size" className="text-sm">
                    Batch Size
                  </Label>
                  <Input
                    id="batch-size"
                    type="number"
                    min="100"
                    max="10000"
                    step="100"
                    value={options.batchSize}
                    onChange={(e) => setOptions({
                      ...options,
                      batchSize: parseInt(e.target.value) || 1000
                    })}
                    className="h-8"
                  />
                  <p className="text-xs text-muted-foreground">
                    Number of records per batch (100-10000)
                  </p>
                </div>
              </div>
            )}

            {/* Export Summary */}
            <div className="space-y-2 p-3 bg-muted rounded-md">
              <div className="flex items-center justify-between text-sm">
                <span>Selected Fields:</span>
                <Badge variant="outline">{selectedFields.length}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Date Range:</span>
                <span>
                  {Math.ceil((options.dateRange.end.getTime() - options.dateRange.start.getTime()) / (1000 * 60 * 60 * 24))} days
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Format:</span>
                <span className="uppercase">{options.format}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleExport}
                disabled={!isDateRangeValid() || selectedFields.length === 0 || isLoading}
              >
                {isLoading ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
