/**
 * Deadline calendar component for feedback deadlines
 */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Plus,
  Edit,
  Trash2,
  Bell,
  BellOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Deadline {
  id: string;
  title: string;
  description: string;
  deadline: Date;
  semester: string;
  academic_year: string;
  section?: string;
  status: 'upcoming' | 'active' | 'warning' | 'expired';
  reminder_sent: boolean;
  created_at: Date;
  created_by: string;
}

interface DeadlineCalendarProps {
  deadlines: Deadline[];
  onAddDeadline?: (deadline: Omit<Deadline, 'id' | 'created_at' | 'created_by'>) => void;
  onEditDeadline?: (id: string, deadline: Partial<Deadline>) => void;
  onDeleteDeadline?: (id: string) => void;
  onSendReminder?: (id: string) => void;
  canManage?: boolean;
}

export function DeadlineCalendar({
  deadlines,
  onAddDeadline,
  onEditDeadline,
  onDeleteDeadline,
  onSendReminder,
  canManage = false
}: DeadlineCalendarProps) {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'list' | 'timeline'>('calendar');
  const [showAddForm, setShowAddForm] = useState(false);

  // Group deadlines by status
  const groupedDeadlines = deadlines.reduce((acc, deadline) => {
    if (!acc[deadline.status]) {
      acc[deadline.status] = [];
    }
    acc[deadline.status].push(deadline);
    return acc;
  }, {} as Record<string, Deadline[]>);

  // Get deadlines for selected date
  const selectedDateDeadlines = deadlines.filter(deadline => {
    const deadlineDate = new Date(deadline.deadline);
    return deadlineDate.toDateString() === selectedDate.toDateString();
  });

  // Get upcoming deadlines (next 7 days)
  const upcomingDeadlines = deadlines.filter(deadline => {
    const now = new Date();
    const deadlineDate = new Date(deadline.deadline);
    const diffTime = deadlineDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 7;
  });

  // Get expired deadlines
  const expiredDeadlines = deadlines.filter(deadline => {
    const now = new Date();
    const deadlineDate = new Date(deadline.deadline);
    return deadlineDate < now;
  });

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-500';
      case 'active': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'expired': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'upcoming': return Clock;
      case 'active': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'expired': return XCircle;
      default: return Clock;
    }
  };

  // Format time remaining
  const getTimeRemaining = (deadline: Date) => {
    const now = new Date();
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.ceil(diffTime / (1000 * 60));

    if (diffTime < 0) {
      return 'Expired';
    } else if (diffDays > 0) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} remaining`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} remaining`;
    } else {
      return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} remaining`;
    }
  };

  // Handle send reminder
  const handleSendReminder = async (deadlineId: string) => {
    try {
      await onSendReminder?.(deadlineId);
      toast({
        title: 'Reminder Sent',
        description: 'Reminder notification has been sent successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send reminder. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Deadline Calendar</h2>
          <p className="text-muted-foreground">
            Manage feedback submission deadlines and reminders
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)}>
            <TabsList>
              <TabsTrigger value="calendar">Calendar</TabsTrigger>
              <TabsTrigger value="list">List</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>
          </Tabs>
          {canManage && (
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Deadline
            </Button>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {groupedDeadlines.upcoming?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Next 7 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {groupedDeadlines.active?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Warning</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {groupedDeadlines.warning?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Need attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {groupedDeadlines.expired?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Past deadline
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Deadlines Alert */}
      {upcomingDeadlines.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You have {upcomingDeadlines.length} deadline{upcomingDeadlines.length !== 1 ? 's' : ''} approaching in the next 7 days.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      {viewMode === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar View */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Calendar View</CardTitle>
                <CardDescription>
                  Select a date to view deadlines
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Simple calendar grid */}
                  <div className="grid grid-cols-7 gap-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                        {day}
                      </div>
                    ))}
                    {Array.from({ length: 35 }, (_, i) => {
                      const date = new Date(selectedDate);
                      date.setDate(1);
                      date.setDate(date.getDate() + i - date.getDay());
                      const isCurrentMonth = date.getMonth() === selectedDate.getMonth();
                      const isToday = date.toDateString() === new Date().toDateString();
                      const hasDeadlines = deadlines.some(d => 
                        new Date(d.deadline).toDateString() === date.toDateString()
                      );
                      
                      return (
                        <button
                          key={i}
                          className={cn(
                            "h-10 w-10 rounded-md text-sm transition-colors",
                            isCurrentMonth ? "text-foreground" : "text-muted-foreground",
                            isToday && "bg-primary text-primary-foreground",
                            hasDeadlines && "bg-yellow-100 border border-yellow-300",
                            "hover:bg-muted"
                          )}
                          onClick={() => setSelectedDate(date)}
                        >
                          {date.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Selected Date Deadlines */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedDate.toLocaleDateString()}
                </CardTitle>
                <CardDescription>
                  Deadlines for selected date
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedDateDeadlines.length > 0 ? (
                  <div className="space-y-3">
                    {selectedDateDeadlines.map(deadline => (
                      <div key={deadline.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{deadline.title}</h4>
                          <Badge className={cn("text-xs", getStatusColor(deadline.status))}>
                            {deadline.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {deadline.description}
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{deadline.semester} {deadline.academic_year}</span>
                          <span>{deadline.section && `Section ${deadline.section}`}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    No deadlines for this date
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {viewMode === 'list' && (
        <div className="space-y-4">
          {Object.entries(groupedDeadlines).map(([status, statusDeadlines]) => (
            <Card key={status}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  {React.createElement(getStatusIcon(status), { className: "h-5 w-5" })}
                  <span className="capitalize">{status} Deadlines</span>
                  <Badge variant="outline">{statusDeadlines.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {statusDeadlines.map(deadline => (
                    <div key={deadline.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium">{deadline.title}</h4>
                          <Badge variant="outline" className="text-xs">
                            {deadline.semester} {deadline.academic_year}
                          </Badge>
                          {deadline.section && (
                            <Badge variant="outline" className="text-xs">
                              Section {deadline.section}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {deadline.description}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span>Deadline: {new Date(deadline.deadline).toLocaleString()}</span>
                          <span>{getTimeRemaining(new Date(deadline.deadline))}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {canManage && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onEditDeadline?.(deadline.id, deadline)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onDeleteDeadline?.(deadline.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendReminder(deadline.id)}
                          disabled={deadline.reminder_sent}
                        >
                          {deadline.reminder_sent ? (
                            <BellOff className="h-4 w-4" />
                          ) : (
                            <Bell className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {viewMode === 'timeline' && (
        <Card>
          <CardHeader>
            <CardTitle>Timeline View</CardTitle>
            <CardDescription>
              Chronological view of all deadlines
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {deadlines
                .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
                .map((deadline, index) => (
                  <div key={deadline.id} className="flex items-start space-x-4">
                    <div className="flex flex-col items-center">
                      <div className={cn(
                        "w-4 h-4 rounded-full border-2",
                        getStatusColor(deadline.status)
                      )} />
                      {index < deadlines.length - 1 && (
                        <div className="w-px h-8 bg-border mt-2" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{deadline.title}</h4>
                        <Badge className={cn("text-xs", getStatusColor(deadline.status))}>
                          {deadline.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {deadline.description}
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                        <span>{new Date(deadline.deadline).toLocaleString()}</span>
                        <span>{deadline.semester} {deadline.academic_year}</span>
                        <span>{getTimeRemaining(new Date(deadline.deadline))}</span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
