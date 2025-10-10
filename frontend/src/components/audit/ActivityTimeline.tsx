/**
 * Activity timeline component for audit trail
 */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  User, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Filter,
  Download,
  RefreshCw,
  Search,
  Calendar,
  Clock,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface AuditEntry {
  id: string;
  timestamp: string;
  user_id: string;
  user_type: string;
  action: string;
  level: 'low' | 'medium' | 'high' | 'critical';
  resource_type: string;
  resource_id: string;
  description: string;
  details: Record<string, any>;
  ip_address: string;
  user_agent: string;
  session_id: string;
  success: boolean;
  error_message?: string;
  tags: string[];
  metadata: Record<string, any>;
}

interface ActivityTimelineProps {
  entries: AuditEntry[];
  onRefresh?: () => void;
  onExport?: (format: 'json' | 'csv') => void;
  onFilter?: (filters: AuditFilters) => void;
  isLoading?: boolean;
  canExport?: boolean;
  canFilter?: boolean;
}

interface AuditFilters {
  user_id?: string;
  user_type?: string;
  action?: string;
  level?: string;
  resource_type?: string;
  resource_id?: string;
  start_date?: string;
  end_date?: string;
  success?: boolean;
  tags?: string[];
}

export function ActivityTimeline({
  entries,
  onRefresh,
  onExport,
  onFilter,
  isLoading = false,
  canExport = true,
  canFilter = true
}: ActivityTimelineProps) {
  const { toast } = useToast();
  const [filters, setFilters] = useState<AuditFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);
  const [viewMode, setViewMode] = useState<'timeline' | 'table' | 'stats'>('timeline');

  // Get unique values for filter options
  const uniqueActions = Array.from(new Set(entries.map(e => e.action)));
  const uniqueLevels = Array.from(new Set(entries.map(e => e.level)));
  const uniqueUserTypes = Array.from(new Set(entries.map(e => e.user_type)));
  const uniqueResourceTypes = Array.from(new Set(entries.map(e => e.resource_type)));

  // Filter entries based on current filters
  const filteredEntries = entries.filter(entry => {
    if (filters.user_id && entry.user_id !== filters.user_id) return false;
    if (filters.user_type && entry.user_type !== filters.user_type) return false;
    if (filters.action && entry.action !== filters.action) return false;
    if (filters.level && entry.level !== filters.level) return false;
    if (filters.resource_type && entry.resource_type !== filters.resource_type) return false;
    if (filters.resource_id && entry.resource_id !== filters.resource_id) return false;
    if (filters.success !== undefined && entry.success !== filters.success) return false;
    if (filters.tags && filters.tags.length > 0) {
      if (!filters.tags.some(tag => entry.tags.includes(tag))) return false;
    }
    return true;
  });

  // Get level color and icon
  const getLevelInfo = (level: string) => {
    switch (level) {
      case 'critical':
        return { color: 'bg-red-500', textColor: 'text-red-700', icon: AlertTriangle };
      case 'high':
        return { color: 'bg-orange-500', textColor: 'text-orange-700', icon: AlertTriangle };
      case 'medium':
        return { color: 'bg-yellow-500', textColor: 'text-yellow-700', icon: Clock };
      case 'low':
        return { color: 'bg-green-500', textColor: 'text-green-700', icon: CheckCircle };
      default:
        return { color: 'bg-gray-500', textColor: 'text-gray-700', icon: Activity };
    }
  };

  // Get action icon
  const getActionIcon = (action: string) => {
    if (action.includes('login')) return User;
    if (action.includes('create')) return CheckCircle;
    if (action.includes('delete')) return XCircle;
    if (action.includes('update')) return RefreshCw;
    if (action.includes('security')) return Shield;
    return Activity;
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString(),
      relative: getRelativeTime(date)
    };
  };

  // Get relative time
  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  // Handle filter change
  const handleFilterChange = (key: keyof AuditFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilter?.(newFilters);
  };

  // Handle export
  const handleExport = async (format: 'json' | 'csv') => {
    try {
      await onExport?.(format);
      toast({
        title: 'Export Started',
        description: `Audit log export in ${format.toUpperCase()} format has been initiated.`,
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to export audit log. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({});
    onFilter?.({});
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Activity Timeline</h2>
          <p className="text-muted-foreground">
            Audit trail and activity logs for system monitoring
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)}>
            <TabsList>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="table">Table</TabsTrigger>
              <TabsTrigger value="stats">Stats</TabsTrigger>
            </TabsList>
          </Tabs>
          
          {canFilter && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
          
          {canExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('csv')}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle>Filter Activity</CardTitle>
            <CardDescription>
              Filter audit entries by various criteria
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">User Type</label>
                <Select
                  value={filters.user_type || ''}
                  onValueChange={(value) => handleFilterChange('user_type', value || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All user types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All user types</SelectItem>
                    {uniqueUserTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Action</label>
                <Select
                  value={filters.action || ''}
                  onValueChange={(value) => handleFilterChange('action', value || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All actions</SelectItem>
                    {uniqueActions.map(action => (
                      <SelectItem key={action} value={action}>
                        {action.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Level</label>
                <Select
                  value={filters.level || ''}
                  onValueChange={(value) => handleFilterChange('level', value || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All levels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All levels</SelectItem>
                    {uniqueLevels.map(level => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Success</label>
                <Select
                  value={filters.success === undefined ? '' : filters.success.toString()}
                  onValueChange={(value) => handleFilterChange('success', value === '' ? undefined : value === 'true')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    <SelectItem value="true">Success</SelectItem>
                    <SelectItem value="false">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                {filteredEntries.length} of {entries.length} entries
              </div>
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      {viewMode === 'timeline' && (
        <div className="space-y-4">
          {filteredEntries.map((entry, index) => {
            const levelInfo = getLevelInfo(entry.level);
            const ActionIcon = getActionIcon(entry.action);
            const timestamp = formatTimestamp(entry.timestamp);
            const LevelIcon = levelInfo.icon;

            return (
              <Card
                key={entry.id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  selectedEntry?.id === entry.id && "ring-2 ring-primary"
                )}
                onClick={() => setSelectedEntry(entry)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center",
                        levelInfo.color
                      )}>
                        <ActionIcon className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-medium truncate">
                            {entry.description}
                          </h4>
                          <Badge className={cn("text-xs", levelInfo.textColor, levelInfo.color)}>
                            {entry.level}
                          </Badge>
                          {entry.success ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {timestamp.relative}
                        </div>
                      </div>
                      
                      <div className="mt-2 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-4">
                          <span>User: {entry.user_id}</span>
                          <span>Type: {entry.user_type}</span>
                          <span>Action: {entry.action.replace(/_/g, ' ')}</span>
                        </div>
                        <div className="flex items-center space-x-4 mt-1">
                          <span>Resource: {entry.resource_type}</span>
                          <span>IP: {entry.ip_address}</span>
                          <span>{timestamp.date} {timestamp.time}</span>
                        </div>
                      </div>
                      
                      {entry.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {entry.tags.map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {viewMode === 'table' && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr>
                    <th className="text-left p-4">Timestamp</th>
                    <th className="text-left p-4">User</th>
                    <th className="text-left p-4">Action</th>
                    <th className="text-left p-4">Level</th>
                    <th className="text-left p-4">Resource</th>
                    <th className="text-left p-4">Status</th>
                    <th className="text-left p-4">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map(entry => {
                    const timestamp = formatTimestamp(entry.timestamp);
                    const levelInfo = getLevelInfo(entry.level);
                    
                    return (
                      <tr key={entry.id} className="border-b hover:bg-muted/50">
                        <td className="p-4">
                          <div className="text-sm">
                            <div>{timestamp.date}</div>
                            <div className="text-muted-foreground">{timestamp.time}</div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm">
                            <div>{entry.user_id}</div>
                            <div className="text-muted-foreground">{entry.user_type}</div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm">{entry.action.replace(/_/g, ' ')}</div>
                        </td>
                        <td className="p-4">
                          <Badge className={cn("text-xs", levelInfo.textColor, levelInfo.color)}>
                            {entry.level}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="text-sm">
                            <div>{entry.resource_type}</div>
                            <div className="text-muted-foreground">{entry.resource_id}</div>
                          </div>
                        </td>
                        <td className="p-4">
                          {entry.success ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </td>
                        <td className="p-4">
                          <div className="text-sm font-mono">{entry.ip_address}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {viewMode === 'stats' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredEntries.length}</div>
              <p className="text-xs text-muted-foreground">
                {entries.length} total entries
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {filteredEntries.length > 0 
                  ? Math.round((filteredEntries.filter(e => e.success).length / filteredEntries.length) * 100)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                Successful operations
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Critical Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {filteredEntries.filter(e => e.level === 'critical').length}
              </div>
              <p className="text-xs text-muted-foreground">
                High priority events
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(filteredEntries.map(e => e.user_id)).size}
              </div>
              <p className="text-xs text-muted-foreground">
                Active users
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Entry Details Modal */}
      {selectedEntry && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Entry Details</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedEntry(null)}
              >
                <EyeOff className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">ID</label>
                  <div className="text-sm font-mono">{selectedEntry.id}</div>
                </div>
                <div>
                  <label className="text-sm font-medium">Timestamp</label>
                  <div className="text-sm">{formatTimestamp(selectedEntry.timestamp).date} {formatTimestamp(selectedEntry.timestamp).time}</div>
                </div>
                <div>
                  <label className="text-sm font-medium">User</label>
                  <div className="text-sm">{selectedEntry.user_id} ({selectedEntry.user_type})</div>
                </div>
                <div>
                  <label className="text-sm font-medium">Action</label>
                  <div className="text-sm">{selectedEntry.action.replace(/_/g, ' ')}</div>
                </div>
                <div>
                  <label className="text-sm font-medium">Level</label>
                  <div className="text-sm">
                    <Badge className={cn("text-xs", getLevelInfo(selectedEntry.level).textColor, getLevelInfo(selectedEntry.level).color)}>
                      {selectedEntry.level}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <div className="text-sm">
                    {selectedEntry.success ? (
                      <span className="text-green-600">Success</span>
                    ) : (
                      <span className="text-red-600">Failed</span>
                    )}
                  </div>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Description</label>
                <div className="text-sm">{selectedEntry.description}</div>
              </div>
              
              {selectedEntry.error_message && (
                <div>
                  <label className="text-sm font-medium">Error Message</label>
                  <div className="text-sm text-red-600">{selectedEntry.error_message}</div>
                </div>
              )}
              
              <div>
                <label className="text-sm font-medium">Details</label>
                <pre className="text-sm bg-muted p-3 rounded-md overflow-auto">
                  {JSON.stringify(selectedEntry.details, null, 2)}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
