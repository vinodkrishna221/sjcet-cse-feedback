/**
 * Error reporting component for bulk operations
 */
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  XCircle, 
  CheckCircle, 
  Download,
  RefreshCw,
  Eye,
  FileText,
  BarChart3,
  Filter,
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface OperationError {
  id: string;
  operation: 'create' | 'update' | 'delete';
  entity_type: string;
  entity_id: string;
  error_type: 'validation' | 'constraint' | 'system' | 'permission';
  message: string;
  field?: string;
  value?: any;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
  resolved_at?: string;
  resolved_by?: string;
}

interface ErrorReportProps {
  errors: OperationError[];
  onResolve: (errorId: string) => Promise<void>;
  onRefresh: () => void;
  isLoading?: boolean;
  canResolve?: boolean;
  onExport?: (format: 'json' | 'csv') => void;
}

interface ErrorStats {
  total: number;
  unresolved: number;
  resolved: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  byOperation: Record<string, number>;
}

export function ErrorReport({
  errors,
  onResolve,
  onRefresh,
  isLoading = false,
  canResolve = true,
  onExport
}: ErrorReportProps) {
  const { toast } = useToast();
  const [selectedError, setSelectedError] = useState<OperationError | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterOperation, setFilterOperation] = useState<string>('all');
  const [filterResolved, setFilterResolved] = useState<string>('unresolved');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'errors' | 'stats'>('overview');

  // Calculate statistics
  const stats: ErrorStats = {
    total: errors.length,
    unresolved: errors.filter(e => !e.resolved).length,
    resolved: errors.filter(e => e.resolved).length,
    byType: errors.reduce((acc, error) => {
      acc[error.error_type] = (acc[error.error_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    bySeverity: errors.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    byOperation: errors.reduce((acc, error) => {
      acc[error.operation] = (acc[error.operation] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };

  // Filter errors
  const filteredErrors = errors.filter(error => {
    if (filterType !== 'all' && error.error_type !== filterType) return false;
    if (filterSeverity !== 'all' && error.severity !== filterSeverity) return false;
    if (filterOperation !== 'all' && error.operation !== filterOperation) return false;
    if (filterResolved === 'resolved' && !error.resolved) return false;
    if (filterResolved === 'unresolved' && error.resolved) return false;
    if (searchTerm && !error.message.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // Handle error resolution
  const handleResolve = async (errorId: string) => {
    try {
      await onResolve(errorId);
      toast({
        title: 'Error Resolved',
        description: 'The error has been marked as resolved.',
      });
      onRefresh();
    } catch (error) {
      toast({
        title: 'Resolution Failed',
        description: 'Failed to resolve the error. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Handle export
  const handleExport = async (format: 'json' | 'csv') => {
    try {
      await onExport?.(format);
      toast({
        title: 'Export Started',
        description: `Error report export in ${format.toUpperCase()} format has been initiated.`,
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to export error report. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500 text-white';
      case 'high':
        return 'bg-orange-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-black';
      case 'low':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  // Get error type icon
  const getErrorTypeIcon = (type: string) => {
    switch (type) {
      case 'validation':
        return AlertTriangle;
      case 'constraint':
        return XCircle;
      case 'system':
        return RefreshCw;
      case 'permission':
        return XCircle;
      default:
        return AlertTriangle;
    }
  };

  // Get operation color
  const getOperationColor = (operation: string) => {
    switch (operation) {
      case 'create':
        return 'bg-green-100 text-green-800';
      case 'update':
        return 'bg-blue-100 text-blue-800';
      case 'delete':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Error Report</h2>
          <p className="text-muted-foreground">
            Track and manage errors from bulk operations
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {onExport && (
            <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <div>
                    <div className="text-2xl font-bold">{stats.total}</div>
                    <div className="text-xs text-muted-foreground">Total Errors</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <XCircle className="h-4 w-4 text-orange-500" />
                  <div>
                    <div className="text-2xl font-bold">{stats.unresolved}</div>
                    <div className="text-xs text-muted-foreground">Unresolved</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <div>
                    <div className="text-2xl font-bold">{stats.resolved}</div>
                    <div className="text-xs text-muted-foreground">Resolved</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-4 w-4 text-blue-500" />
                  <div>
                    <div className="text-2xl font-bold">
                      {stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}%
                    </div>
                    <div className="text-xs text-muted-foreground">Resolution Rate</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Errors */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Errors</CardTitle>
              <CardDescription>
                Latest errors that need attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {errors
                  .filter(e => !e.resolved)
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .slice(0, 5)
                  .map(error => {
                    const ErrorIcon = getErrorTypeIcon(error.error_type);
                    return (
                      <div key={error.id} className="flex items-center justify-between p-3 border rounded-md">
                        <div className="flex items-center space-x-3">
                          <ErrorIcon className="h-4 w-4 text-red-500" />
                          <div>
                            <div className="text-sm font-medium">{error.message}</div>
                            <div className="text-xs text-muted-foreground">
                              {error.operation} • {error.entity_type} • {new Date(error.timestamp).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={cn("text-xs", getSeverityColor(error.severity))}>
                            {error.severity}
                          </Badge>
                          {canResolve && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleResolve(error.id)}
                            >
                              Resolve
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

        {/* Errors Tab */}
        <TabsContent value="errors" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Filter className="h-5 w-5" />
                <span>Filters</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Search</label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                      className="w-full pl-8 pr-3 py-2 border rounded-md text-sm"
                      placeholder="Search errors..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Type</label>
                  <select
                    className="w-full p-2 border rounded-md text-sm"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                  >
                    <option value="all">All Types</option>
                    <option value="validation">Validation</option>
                    <option value="constraint">Constraint</option>
                    <option value="system">System</option>
                    <option value="permission">Permission</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Severity</label>
                  <select
                    className="w-full p-2 border rounded-md text-sm"
                    value={filterSeverity}
                    onChange={(e) => setFilterSeverity(e.target.value)}
                  >
                    <option value="all">All Severities</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Operation</label>
                  <select
                    className="w-full p-2 border rounded-md text-sm"
                    value={filterOperation}
                    onChange={(e) => setFilterOperation(e.target.value)}
                  >
                    <option value="all">All Operations</option>
                    <option value="create">Create</option>
                    <option value="update">Update</option>
                    <option value="delete">Delete</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <select
                    className="w-full p-2 border rounded-md text-sm"
                    value={filterResolved}
                    onChange={(e) => setFilterResolved(e.target.value)}
                  >
                    <option value="unresolved">Unresolved</option>
                    <option value="resolved">Resolved</option>
                    <option value="all">All</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error List */}
          <Card>
            <CardHeader>
              <CardTitle>Error Details</CardTitle>
              <CardDescription>
                {filteredErrors.length} errors found
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filteredErrors.map(error => {
                  const ErrorIcon = getErrorTypeIcon(error.error_type);
                  return (
                    <div
                      key={error.id}
                      className={cn(
                        "flex items-center justify-between p-3 border rounded-md cursor-pointer hover:bg-muted/50",
                        error.resolved && "opacity-60"
                      )}
                      onClick={() => setSelectedError(error)}
                    >
                      <div className="flex items-center space-x-3">
                        <ErrorIcon className="h-4 w-4 text-red-500" />
                        <div>
                          <div className="text-sm font-medium">{error.message}</div>
                          <div className="text-xs text-muted-foreground">
                            {error.operation} • {error.entity_type} • {error.entity_id} • {new Date(error.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={cn("text-xs", getSeverityColor(error.severity))}>
                          {error.severity}
                        </Badge>
                        <Badge className={cn("text-xs", getOperationColor(error.operation))}>
                          {error.operation}
                        </Badge>
                        {error.resolved ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="stats" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Error Types */}
            <Card>
              <CardHeader>
                <CardTitle>Error Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(stats.byType).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-sm capitalize">{type}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Severity Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Severity Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(stats.bySeverity).map(([severity, count]) => (
                    <div key={severity} className="flex items-center justify-between">
                      <span className="text-sm capitalize">{severity}</span>
                      <Badge className={cn("text-xs", getSeverityColor(severity))}>
                        {count}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Operations */}
            <Card>
              <CardHeader>
                <CardTitle>Operations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(stats.byOperation).map(([operation, count]) => (
                    <div key={operation} className="flex items-center justify-between">
                      <span className="text-sm capitalize">{operation}</span>
                      <Badge className={cn("text-xs", getOperationColor(operation))}>
                        {count}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Resolution Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Resolution Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">
                    Resolution timeline chart would go here
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Error Detail Modal */}
      {selectedError && (
        <Card className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <span>Error Details</span>
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedError(null)}
                >
                  <EyeOff className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Error ID</label>
                  <div className="text-sm font-mono">{selectedError.id}</div>
                </div>
                <div>
                  <label className="text-sm font-medium">Timestamp</label>
                  <div className="text-sm">{new Date(selectedError.timestamp).toLocaleString()}</div>
                </div>
                <div>
                  <label className="text-sm font-medium">Operation</label>
                  <Badge className={cn("text-xs", getOperationColor(selectedError.operation))}>
                    {selectedError.operation}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium">Severity</label>
                  <Badge className={cn("text-xs", getSeverityColor(selectedError.severity))}>
                    {selectedError.severity}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium">Entity Type</label>
                  <div className="text-sm">{selectedError.entity_type}</div>
                </div>
                <div>
                  <label className="text-sm font-medium">Entity ID</label>
                  <div className="text-sm font-mono">{selectedError.entity_id}</div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Error Message</label>
                <div className="text-sm p-3 bg-muted rounded-md">{selectedError.message}</div>
              </div>

              {selectedError.field && (
                <div>
                  <label className="text-sm font-medium">Field</label>
                  <div className="text-sm">{selectedError.field}</div>
                </div>
              )}

              {selectedError.value && (
                <div>
                  <label className="text-sm font-medium">Value</label>
                  <div className="text-sm font-mono p-3 bg-muted rounded-md">{selectedError.value}</div>
                </div>
              )}

              {selectedError.resolved && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Resolved At</label>
                    <div className="text-sm">{new Date(selectedError.resolved_at!).toLocaleString()}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Resolved By</label>
                    <div className="text-sm">{selectedError.resolved_by}</div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end space-x-2">
                <Button variant="outline" onClick={() => setSelectedError(null)}>
                  Close
                </Button>
                {canResolve && !selectedError.resolved && (
                  <Button onClick={() => handleResolve(selectedError.id)}>
                    Mark as Resolved
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </Card>
      )}
    </div>
  );
}
