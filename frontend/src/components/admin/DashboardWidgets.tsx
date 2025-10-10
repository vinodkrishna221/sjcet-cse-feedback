/**
 * Customizable dashboard widgets component
 */
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Users, 
  BookOpen, 
  MessageSquare,
  Settings,
  Plus,
  Minus,
  Move,
  Eye,
  EyeOff,
  Download,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface WidgetConfig {
  id: string;
  type: 'chart' | 'metric' | 'table' | 'list';
  title: string;
  description?: string;
  size: 'small' | 'medium' | 'large';
  position: { x: number; y: number };
  visible: boolean;
  dataSource: string;
  refreshInterval?: number;
  filters?: Record<string, any>;
  chartType?: 'bar' | 'line' | 'pie' | 'doughnut';
  metricType?: 'count' | 'sum' | 'average' | 'percentage';
  columns?: string[];
  limit?: number;
}

interface DashboardWidgetsProps {
  widgets: WidgetConfig[];
  onUpdateWidget: (widgetId: string, updates: Partial<WidgetConfig>) => void;
  onAddWidget: (widget: Omit<WidgetConfig, 'id'>) => void;
  onRemoveWidget: (widgetId: string) => void;
  onReorderWidgets: (widgets: WidgetConfig[]) => void;
  availableDataSources: Array<{
    id: string;
    name: string;
    type: 'students' | 'faculty' | 'feedback' | 'reports';
    description: string;
  }>;
  isLoading?: boolean;
}

const WIDGET_TYPES = [
  { value: 'chart', label: 'Chart', icon: BarChart3 },
  { value: 'metric', label: 'Metric', icon: TrendingUp },
  { value: 'table', label: 'Table', icon: BookOpen },
  { value: 'list', label: 'List', icon: MessageSquare }
];

const CHART_TYPES = [
  { value: 'bar', label: 'Bar Chart' },
  { value: 'line', label: 'Line Chart' },
  { value: 'pie', label: 'Pie Chart' },
  { value: 'doughnut', label: 'Doughnut Chart' }
];

const METRIC_TYPES = [
  { value: 'count', label: 'Count' },
  { value: 'sum', label: 'Sum' },
  { value: 'average', label: 'Average' },
  { value: 'percentage', label: 'Percentage' }
];

const WIDGET_SIZES = [
  { value: 'small', label: 'Small (1x1)' },
  { value: 'medium', label: 'Medium (2x1)' },
  { value: 'large', label: 'Large (2x2)' }
];

export function DashboardWidgets({
  widgets,
  onUpdateWidget,
  onAddWidget,
  onRemoveWidget,
  onReorderWidgets,
  availableDataSources,
  isLoading = false
}: DashboardWidgetsProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'widgets' | 'add'>('widgets');
  const [editingWidget, setEditingWidget] = useState<WidgetConfig | null>(null);
  const [newWidget, setNewWidget] = useState<Partial<WidgetConfig>>({
    type: 'metric',
    size: 'medium',
    visible: true,
    position: { x: 0, y: 0 }
  });

  // Handle widget update
  const handleUpdateWidget = useCallback((widgetId: string, updates: Partial<WidgetConfig>) => {
    onUpdateWidget(widgetId, updates);
    toast({
      title: 'Widget Updated',
      description: 'Widget configuration has been updated.',
    });
  }, [onUpdateWidget, toast]);

  // Handle add widget
  const handleAddWidget = useCallback(() => {
    if (!newWidget.title || !newWidget.dataSource) {
      toast({
        title: 'Missing Information',
        description: 'Please provide widget title and data source.',
        variant: 'destructive',
      });
      return;
    }

    onAddWidget(newWidget as Omit<WidgetConfig, 'id'>);
    toast({
      title: 'Widget Added',
      description: 'New widget has been added to the dashboard.',
    });
    
    setNewWidget({
      type: 'metric',
      size: 'medium',
      visible: true,
      position: { x: 0, y: 0 }
    });
    setActiveTab('widgets');
  }, [newWidget, onAddWidget, toast]);

  // Handle remove widget
  const handleRemoveWidget = useCallback((widgetId: string) => {
    onRemoveWidget(widgetId);
    toast({
      title: 'Widget Removed',
      description: 'Widget has been removed from the dashboard.',
    });
  }, [onRemoveWidget, toast]);

  // Toggle widget visibility
  const toggleWidgetVisibility = useCallback((widgetId: string) => {
    const widget = widgets.find(w => w.id === widgetId);
    if (widget) {
      handleUpdateWidget(widgetId, { visible: !widget.visible });
    }
  }, [widgets, handleUpdateWidget]);

  // Get widget icon
  const getWidgetIcon = (type: string) => {
    const widgetType = WIDGET_TYPES.find(t => t.value === type);
    return widgetType?.icon || BarChart3;
  };

  // Get data source name
  const getDataSourceName = (dataSourceId: string) => {
    const source = availableDataSources.find(s => s.id === dataSourceId);
    return source?.name || dataSourceId;
  };

  // Render widget preview
  const renderWidgetPreview = (widget: WidgetConfig) => {
    const Icon = getWidgetIcon(widget.type);
    
    return (
      <div className={cn(
        "p-4 border rounded-lg bg-muted/50",
        widget.size === 'small' && "h-24",
        widget.size === 'medium' && "h-32",
        widget.size === 'large' && "h-48"
      )}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Icon className="h-4 w-4" />
            <span className="text-sm font-medium">{widget.title}</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {widget.size}
          </Badge>
        </div>
        
        <div className="text-xs text-muted-foreground">
          {widget.description || `${widget.type} widget`}
        </div>
        
        {widget.type === 'chart' && (
          <div className="mt-2 text-xs">
            Chart Type: {widget.chartType || 'bar'}
          </div>
        )}
        
        {widget.type === 'metric' && (
          <div className="mt-2 text-xs">
            Metric Type: {widget.metricType || 'count'}
          </div>
        )}
        
        <div className="mt-2 text-xs text-muted-foreground">
          Data: {getDataSourceName(widget.dataSource)}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dashboard Widgets</h2>
          <p className="text-muted-foreground">
            Customize your dashboard with interactive widgets
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => setActiveTab('add')}>
            <Plus className="h-4 w-4 mr-2" />
            Add Widget
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList>
          <TabsTrigger value="widgets">Widgets</TabsTrigger>
          <TabsTrigger value="add">Add Widget</TabsTrigger>
        </TabsList>

        {/* Widgets Tab */}
        <TabsContent value="widgets" className="space-y-4">
          {/* Widget Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {widgets.map(widget => (
              <Card key={widget.id} className={cn(
                "transition-all hover:shadow-md",
                !widget.visible && "opacity-50"
              )}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center space-x-2">
                      {React.createElement(getWidgetIcon(widget.type), { className: "h-4 w-4" })}
                      <span>{widget.title}</span>
                    </CardTitle>
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleWidgetVisibility(widget.id)}
                      >
                        {widget.visible ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingWidget(widget)}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveWidget(widget.id)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {renderWidgetPreview(widget)}
                </CardContent>
              </Card>
            ))}
          </div>

          {widgets.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Widgets</h3>
                <p className="text-muted-foreground mb-4">
                  Add widgets to customize your dashboard
                </p>
                <Button onClick={() => setActiveTab('add')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Widget
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Add Widget Tab */}
        <TabsContent value="add" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Add New Widget</CardTitle>
              <CardDescription>
                Configure a new widget for your dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="widget-title">Widget Title</Label>
                  <Input
                    id="widget-title"
                    placeholder="Enter widget title"
                    value={newWidget.title || ''}
                    onChange={(e) => setNewWidget({ ...newWidget, title: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="widget-description">Description</Label>
                  <Input
                    id="widget-description"
                    placeholder="Enter description (optional)"
                    value={newWidget.description || ''}
                    onChange={(e) => setNewWidget({ ...newWidget, description: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="widget-type">Widget Type</Label>
                  <Select
                    value={newWidget.type || 'metric'}
                    onValueChange={(value) => setNewWidget({ ...newWidget, type: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WIDGET_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center space-x-2">
                            <type.icon className="h-4 w-4" />
                            <span>{type.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="widget-size">Size</Label>
                  <Select
                    value={newWidget.size || 'medium'}
                    onValueChange={(value) => setNewWidget({ ...newWidget, size: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WIDGET_SIZES.map(size => (
                        <SelectItem key={size.value} value={size.value}>
                          {size.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="data-source">Data Source</Label>
                  <Select
                    value={newWidget.dataSource || ''}
                    onValueChange={(value) => setNewWidget({ ...newWidget, dataSource: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select data source" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDataSources.map(source => (
                        <SelectItem key={source.id} value={source.id}>
                          <div>
                            <div className="font-medium">{source.name}</div>
                            <div className="text-xs text-muted-foreground">{source.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="refresh-interval">Refresh Interval (minutes)</Label>
                  <Input
                    id="refresh-interval"
                    type="number"
                    min="1"
                    max="1440"
                    placeholder="Auto refresh interval"
                    value={newWidget.refreshInterval || ''}
                    onChange={(e) => setNewWidget({ 
                      ...newWidget, 
                      refreshInterval: parseInt(e.target.value) || undefined 
                    })}
                  />
                </div>
              </div>

              {/* Widget Type Specific Options */}
              {newWidget.type === 'chart' && (
                <div>
                  <Label htmlFor="chart-type">Chart Type</Label>
                  <Select
                    value={newWidget.chartType || 'bar'}
                    onValueChange={(value) => setNewWidget({ ...newWidget, chartType: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CHART_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {newWidget.type === 'metric' && (
                <div>
                  <Label htmlFor="metric-type">Metric Type</Label>
                  <Select
                    value={newWidget.metricType || 'count'}
                    onValueChange={(value) => setNewWidget({ ...newWidget, metricType: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {METRIC_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(newWidget.type === 'table' || newWidget.type === 'list') && (
                <div>
                  <Label htmlFor="columns">Columns (comma-separated)</Label>
                  <Input
                    id="columns"
                    placeholder="column1, column2, column3"
                    value={newWidget.columns?.join(', ') || ''}
                    onChange={(e) => setNewWidget({ 
                      ...newWidget, 
                      columns: e.target.value.split(',').map(c => c.trim()).filter(c => c)
                    })}
                  />
                </div>
              )}

              {/* Preview */}
              {newWidget.title && (
                <div className="space-y-2">
                  <Label>Preview</Label>
                  {renderWidgetPreview(newWidget as WidgetConfig)}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-2">
                <Button variant="outline" onClick={() => setActiveTab('widgets')}>
                  Cancel
                </Button>
                <Button onClick={handleAddWidget} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Widget
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Widget Edit Modal */}
      {editingWidget && (
        <Card className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Edit Widget</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingWidget(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-title">Title</Label>
                  <Input
                    id="edit-title"
                    value={editingWidget.title}
                    onChange={(e) => setEditingWidget({ ...editingWidget, title: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Input
                    id="edit-description"
                    value={editingWidget.description || ''}
                    onChange={(e) => setEditingWidget({ ...editingWidget, description: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="edit-size">Size</Label>
                  <Select
                    value={editingWidget.size}
                    onValueChange={(value) => setEditingWidget({ ...editingWidget, size: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WIDGET_SIZES.map(size => (
                        <SelectItem key={size.value} value={size.value}>
                          {size.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="edit-refresh">Refresh Interval (minutes)</Label>
                  <Input
                    id="edit-refresh"
                    type="number"
                    min="1"
                    max="1440"
                    value={editingWidget.refreshInterval || ''}
                    onChange={(e) => setEditingWidget({ 
                      ...editingWidget, 
                      refreshInterval: parseInt(e.target.value) || undefined 
                    })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2">
                <Button variant="outline" onClick={() => setEditingWidget(null)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  handleUpdateWidget(editingWidget.id, editingWidget);
                  setEditingWidget(null);
                }}>
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </Card>
      )}
    </div>
  );
}
