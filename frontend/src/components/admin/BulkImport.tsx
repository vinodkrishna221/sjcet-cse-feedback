/**
 * Bulk import component with preview and validation
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
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Download,
  Eye,
  Trash2,
  RefreshCw,
  Plus,
  Minus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';

interface ValidationError {
  row: number;
  field: string;
  message: string;
  value?: any;
}

interface ImportPreview {
  data: any[];
  errors: ValidationError[];
  warnings: ValidationError[];
  totalRows: number;
  validRows: number;
  invalidRows: number;
}

interface BulkImportProps {
  entityType: 'students' | 'faculty' | 'admins';
  onImport: (data: any[], options: ImportOptions) => Promise<ImportResult>;
  templateUrl?: string;
  maxRows?: number;
}

interface ImportOptions {
  skipInvalidRows: boolean;
  updateExisting: boolean;
  validateOnly: boolean;
  batchSize: number;
}

interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: ValidationError[];
  warnings: ValidationError[];
}

const ENTITY_SCHEMAS = {
  students: {
    required: ['name', 'reg_number', 'section', 'department', 'batch_year'],
    optional: ['email', 'phone', 'address'],
    validation: {
      name: (value: string) => value && value.length >= 2,
      reg_number: (value: string) => /^[A-Z0-9]+$/.test(value),
      section: (value: string) => ['A', 'B'].includes(value.toUpperCase()),
      department: (value: string) => ['CSE', 'ECE', 'EEE', 'ME', 'CE'].includes(value.toUpperCase()),
      batch_year: (value: string) => /^\d{4}$/.test(value) && parseInt(value) >= 2020,
      email: (value: string) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      phone: (value: string) => !value || /^\d{10}$/.test(value)
    }
  },
  faculty: {
    required: ['name', 'employee_id', 'department', 'subjects'],
    optional: ['email', 'phone', 'qualification', 'experience'],
    validation: {
      name: (value: string) => value && value.length >= 2,
      employee_id: (value: string) => /^[A-Z0-9]+$/.test(value),
      department: (value: string) => ['CSE', 'ECE', 'EEE', 'ME', 'CE'].includes(value.toUpperCase()),
      subjects: (value: string) => value && value.split(',').length > 0,
      email: (value: string) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      phone: (value: string) => !value || /^\d{10}$/.test(value),
      experience: (value: string) => !value || /^\d+$/.test(value)
    }
  },
  admins: {
    required: ['name', 'email', 'role'],
    optional: ['department', 'phone'],
    validation: {
      name: (value: string) => value && value.length >= 2,
      email: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      role: (value: string) => ['principal', 'hod', 'admin'].includes(value.toLowerCase()),
      department: (value: string) => !value || ['CSE', 'ECE', 'EEE', 'ME', 'CE'].includes(value.toUpperCase()),
      phone: (value: string) => !value || /^\d{10}$/.test(value)
    }
  }
};

export function BulkImport({ entityType, onImport, templateUrl, maxRows = 1000 }: BulkImportProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importOptions, setImportOptions] = useState<ImportOptions>({
    skipInvalidRows: true,
    updateExisting: false,
    validateOnly: false,
    batchSize: 100
  });
  const [activeTab, setActiveTab] = useState<'upload' | 'preview' | 'import'>('upload');

  const schema = ENTITY_SCHEMAS[entityType];

  // Handle file upload
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (!uploadedFile) return;

    if (!uploadedFile.name.endsWith('.csv')) {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload a CSV file.',
        variant: 'destructive',
      });
      return;
    }

    if (uploadedFile.size > 10 * 1024 * 1024) { // 10MB limit
      toast({
        title: 'File Too Large',
        description: 'File size must be less than 10MB.',
        variant: 'destructive',
      });
      return;
    }

    setFile(uploadedFile);
    processFile(uploadedFile);
  }, [toast]);

  // Process uploaded file
  const processFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    try {
      const text = await file.text();
      const result = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim().toLowerCase()
      });

      if (result.errors.length > 0) {
        toast({
          title: 'CSV Parse Error',
          description: 'Failed to parse CSV file. Please check the format.',
          variant: 'destructive',
        });
        return;
      }

      const data = result.data as any[];
      if (data.length > maxRows) {
        toast({
          title: 'Too Many Rows',
          description: `Maximum ${maxRows} rows allowed. File has ${data.length} rows.`,
          variant: 'destructive',
        });
        return;
      }

      const validationResult = validateData(data);
      setPreview(validationResult);
      setActiveTab('preview');
    } catch (error) {
      toast({
        title: 'File Processing Error',
        description: 'Failed to process file. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [maxRows, toast]);

  // Validate data against schema
  const validateData = (data: any[]): ImportPreview => {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    data.forEach((row, index) => {
      const rowNum = index + 2; // +2 because CSV is 1-indexed and has header

      // Check required fields
      schema.required.forEach(field => {
        if (!row[field] || row[field].toString().trim() === '') {
          errors.push({
            row: rowNum,
            field,
            message: `${field} is required`,
            value: row[field]
          });
        }
      });

      // Validate field values
      Object.entries(schema.validation).forEach(([field, validator]) => {
        const value = row[field];
        if (value !== undefined && value !== null && value.toString().trim() !== '') {
          if (!validator(value.toString().trim())) {
            errors.push({
              row: rowNum,
              field,
              message: `Invalid ${field} format`,
              value
            });
          }
        }
      });

      // Check for duplicates
      const duplicateRow = data.find((otherRow, otherIndex) => 
        otherIndex !== index && 
        schema.required.every(field => 
          row[field] && otherRow[field] && 
          row[field].toString().trim() === otherRow[field].toString().trim()
        )
      );

      if (duplicateRow) {
        warnings.push({
          row: rowNum,
          field: 'duplicate',
          message: 'Duplicate row found',
          value: row
        });
      }
    });

    const validRows = data.length - errors.length;
    const invalidRows = errors.length;

    return {
      data,
      errors,
      warnings,
      totalRows: data.length,
      validRows,
      invalidRows
    };
  };

  // Handle import
  const handleImport = async () => {
    if (!preview) return;

    setIsImporting(true);
    try {
      const result = await onImport(preview.data, importOptions);
      
      if (result.success) {
        toast({
          title: 'Import Successful',
          description: `Successfully imported ${result.imported} records.`,
        });
        setActiveTab('import');
      } else {
        toast({
          title: 'Import Failed',
          description: `Failed to import ${result.failed} records.`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Import Error',
        description: 'An error occurred during import. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Download template
  const downloadTemplate = () => {
    if (!templateUrl) return;
    
    const link = document.createElement('a');
    link.href = templateUrl;
    link.download = `${entityType}_template.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Reset form
  const resetForm = () => {
    setFile(null);
    setPreview(null);
    setActiveTab('upload');
    setImportOptions({
      skipInvalidRows: true,
      updateExisting: false,
      validateOnly: false,
      batchSize: 100
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Bulk Import {entityType.charAt(0).toUpperCase() + entityType.slice(1)}</h2>
          <p className="text-muted-foreground">
            Import multiple records from a CSV file with validation and preview
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {templateUrl && (
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={resetForm}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList>
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="preview" disabled={!preview}>Preview</TabsTrigger>
          <TabsTrigger value="import" disabled={!preview}>Import</TabsTrigger>
        </TabsList>

        {/* Upload Tab */}
        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload CSV File</CardTitle>
              <CardDescription>
                Select a CSV file containing {entityType} data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <div className="space-y-2">
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    <span className="text-lg font-medium">Choose CSV File</span>
                    <Input
                      id="file-upload"
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Maximum file size: 10MB, Maximum rows: {maxRows}
                  </p>
                </div>
              </div>

              {file && (
                <div className="flex items-center space-x-2 p-3 bg-muted rounded-md">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm font-medium">{file.name}</span>
                  <Badge variant="outline">{file.size} bytes</Badge>
                </div>
              )}

              {/* Required Fields Info */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Required Fields</Label>
                <div className="flex flex-wrap gap-2">
                  {schema.required.map(field => (
                    <Badge key={field} variant="default">
                      {field}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Optional Fields Info */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Optional Fields</Label>
                <div className="flex flex-wrap gap-2">
                  {schema.optional.map(field => (
                    <Badge key={field} variant="outline">
                      {field}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-4">
          {preview && (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-blue-500" />
                      <div>
                        <div className="text-2xl font-bold">{preview.totalRows}</div>
                        <div className="text-xs text-muted-foreground">Total Rows</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <div>
                        <div className="text-2xl font-bold">{preview.validRows}</div>
                        <div className="text-xs text-muted-foreground">Valid Rows</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <div>
                        <div className="text-2xl font-bold">{preview.invalidRows}</div>
                        <div className="text-xs text-muted-foreground">Invalid Rows</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      <div>
                        <div className="text-2xl font-bold">{preview.warnings.length}</div>
                        <div className="text-xs text-muted-foreground">Warnings</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Errors */}
              {preview.errors.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <XCircle className="h-5 w-5 text-red-500" />
                      <span>Validation Errors</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {preview.errors.map((error, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-red-50 rounded-md">
                          <div className="flex items-center space-x-2">
                            <Badge variant="destructive">Row {error.row}</Badge>
                            <span className="text-sm font-medium">{error.field}</span>
                            <span className="text-sm text-muted-foreground">{error.message}</span>
                          </div>
                          {error.value && (
                            <Badge variant="outline" className="text-xs">
                              {error.value}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Warnings */}
              {preview.warnings.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                      <span>Warnings</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {preview.warnings.map((warning, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-orange-50 rounded-md">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">Row {warning.row}</Badge>
                            <span className="text-sm text-muted-foreground">{warning.message}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Data Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Eye className="h-5 w-5" />
                    <span>Data Preview</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          {Object.keys(preview.data[0] || {}).map(header => (
                            <th key={header} className="text-left p-2 font-medium">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.data.slice(0, 5).map((row, index) => (
                          <tr key={index} className="border-b">
                            {Object.values(row).map((value, cellIndex) => (
                              <td key={cellIndex} className="p-2">
                                {value?.toString() || '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {preview.data.length > 5 && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Showing first 5 rows of {preview.data.length} total rows
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Import Tab */}
        <TabsContent value="import" className="space-y-4">
          {preview && (
            <Card>
              <CardHeader>
                <CardTitle>Import Options</CardTitle>
                <CardDescription>
                  Configure import settings before proceeding
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="skip-invalid">Skip Invalid Rows</Label>
                    <Select
                      value={importOptions.skipInvalidRows.toString()}
                      onValueChange={(value) => setImportOptions({
                        ...importOptions,
                        skipInvalidRows: value === 'true'
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="update-existing">Update Existing Records</Label>
                    <Select
                      value={importOptions.updateExisting.toString()}
                      onValueChange={(value) => setImportOptions({
                        ...importOptions,
                        updateExisting: value === 'true'
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="validate-only">Validate Only</Label>
                    <Select
                      value={importOptions.validateOnly.toString()}
                      onValueChange={(value) => setImportOptions({
                        ...importOptions,
                        validateOnly: value === 'true'
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="batch-size">Batch Size</Label>
                    <Input
                      id="batch-size"
                      type="number"
                      min="10"
                      max="500"
                      value={importOptions.batchSize}
                      onChange={(e) => setImportOptions({
                        ...importOptions,
                        batchSize: parseInt(e.target.value) || 100
                      })}
                    />
                  </div>
                </div>

                {/* Import Summary */}
                <div className="p-4 bg-muted rounded-md">
                  <h4 className="font-medium mb-2">Import Summary</h4>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div>Total rows: {preview.totalRows}</div>
                    <div>Valid rows: {preview.validRows}</div>
                    <div>Invalid rows: {preview.invalidRows}</div>
                    <div>Warnings: {preview.warnings.length}</div>
                    <div>Skip invalid: {importOptions.skipInvalidRows ? 'Yes' : 'No'}</div>
                    <div>Update existing: {importOptions.updateExisting ? 'Yes' : 'No'}</div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end space-x-2">
                  <Button variant="outline" onClick={() => setActiveTab('preview')}>
                    Back to Preview
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={isImporting || preview.invalidRows > 0 && !importOptions.skipInvalidRows}
                  >
                    {isImporting ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Start Import
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
