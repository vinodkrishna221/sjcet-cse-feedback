/**
 * Notification preferences component
 */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Bell, 
  Mail, 
  MessageSquare, 
  Smartphone, 
  Settings,
  Save,
  RefreshCw,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface NotificationPreference {
  id: string;
  type: string;
  name: string;
  description: string;
  enabled: boolean;
  channels: {
    email: boolean;
    sms: boolean;
    push: boolean;
    in_app: boolean;
  };
  frequency: 'immediate' | 'daily' | 'weekly' | 'never';
  quiet_hours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

interface NotificationPreferencesProps {
  preferences: NotificationPreference[];
  onUpdatePreferences?: (preferences: NotificationPreference[]) => void;
  onTestNotification?: (type: string, channel: string) => void;
  isLoading?: boolean;
}

export function NotificationPreferences({
  preferences,
  onUpdatePreferences,
  onTestNotification,
  isLoading = false
}: NotificationPreferencesProps) {
  const { toast } = useToast();
  const [localPreferences, setLocalPreferences] = useState<NotificationPreference[]>(preferences);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  // Update local preferences when props change
  useEffect(() => {
    setLocalPreferences(preferences);
    setHasChanges(false);
  }, [preferences]);

  // Handle preference change
  const handlePreferenceChange = (id: string, field: string, value: any) => {
    setLocalPreferences(prev => 
      prev.map(pref => 
        pref.id === id 
          ? { ...pref, [field]: value }
          : pref
      )
    );
    setHasChanges(true);
  };

  // Handle channel change
  const handleChannelChange = (id: string, channel: string, enabled: boolean) => {
    setLocalPreferences(prev => 
      prev.map(pref => 
        pref.id === id 
          ? { 
              ...pref, 
              channels: { 
                ...pref.channels, 
                [channel]: enabled 
              } 
            }
          : pref
      )
    );
    setHasChanges(true);
  };

  // Handle quiet hours change
  const handleQuietHoursChange = (id: string, field: string, value: any) => {
    setLocalPreferences(prev => 
      prev.map(pref => 
        pref.id === id 
          ? { 
              ...pref, 
              quiet_hours: { 
                ...pref.quiet_hours, 
                [field]: value 
              } 
            }
          : pref
      )
    );
    setHasChanges(true);
  };

  // Save preferences
  const handleSave = async () => {
    try {
      await onUpdatePreferences?.(localPreferences);
      setHasChanges(false);
      toast({
        title: 'Preferences Saved',
        description: 'Your notification preferences have been updated successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save preferences. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Test notification
  const handleTestNotification = async (type: string, channel: string) => {
    try {
      await onTestNotification?.(type, channel);
      toast({
        title: 'Test Notification Sent',
        description: `Test ${channel} notification has been sent.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send test notification. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Group preferences by category
  const groupedPreferences = localPreferences.reduce((acc, pref) => {
    const category = pref.type.split('_')[0];
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(pref);
    return acc;
  }, {} as Record<string, NotificationPreference[]>);

  // Get channel icon
  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email': return Mail;
      case 'sms': return Smartphone;
      case 'push': return Bell;
      case 'in_app': return MessageSquare;
      default: return Bell;
    }
  };

  // Get frequency label
  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case 'immediate': return 'Immediate';
      case 'daily': return 'Daily Digest';
      case 'weekly': return 'Weekly Summary';
      case 'never': return 'Never';
      default: return frequency;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Notification Preferences</h2>
          <p className="text-muted-foreground">
            Customize how and when you receive notifications
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {hasChanges && (
            <Badge variant="outline" className="text-yellow-600">
              <AlertCircle className="h-3 w-3 mr-1" />
              Unsaved Changes
            </Badge>
          )}
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isLoading}
            className="min-w-[100px]"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Save reminder */}
      {hasChanges && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You have unsaved changes. Click "Save Changes" to update your notification preferences.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Notification Settings</CardTitle>
              <CardDescription>
                Configure your overall notification preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {groupedPreferences.general?.map(preference => (
                <div key={preference.id} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{preference.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {preference.description}
                      </p>
                    </div>
                    <Switch
                      checked={preference.enabled}
                      onCheckedChange={(enabled) => 
                        handlePreferenceChange(preference.id, 'enabled', enabled)
                      }
                    />
                  </div>

                  {preference.enabled && (
                    <div className="ml-6 space-y-4">
                      {/* Notification Channels */}
                      <div>
                        <Label className="text-sm font-medium">Notification Channels</Label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                          {Object.entries(preference.channels).map(([channel, enabled]) => {
                            const Icon = getChannelIcon(channel);
                            return (
                              <div key={channel} className="flex items-center space-x-2">
                                <Switch
                                  checked={enabled}
                                  onCheckedChange={(checked) => 
                                    handleChannelChange(preference.id, channel, checked)
                                  }
                                />
                                <Icon className="h-4 w-4" />
                                <Label className="text-sm capitalize">{channel}</Label>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Frequency */}
                      <div>
                        <Label className="text-sm font-medium">Frequency</Label>
                        <Select
                          value={preference.frequency}
                          onValueChange={(value) => 
                            handlePreferenceChange(preference.id, 'frequency', value)
                          }
                        >
                          <SelectTrigger className="w-48 mt-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="immediate">Immediate</SelectItem>
                            <SelectItem value="daily">Daily Digest</SelectItem>
                            <SelectItem value="weekly">Weekly Summary</SelectItem>
                            <SelectItem value="never">Never</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Quiet Hours */}
                      <div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={preference.quiet_hours.enabled}
                            onCheckedChange={(enabled) => 
                              handleQuietHoursChange(preference.id, 'enabled', enabled)
                            }
                          />
                          <Label className="text-sm font-medium">Quiet Hours</Label>
                        </div>
                        
                        {preference.quiet_hours.enabled && (
                          <div className="ml-6 grid grid-cols-2 gap-4 mt-2">
                            <div>
                              <Label className="text-xs text-muted-foreground">Start Time</Label>
                              <input
                                type="time"
                                value={preference.quiet_hours.start}
                                onChange={(e) => 
                                  handleQuietHoursChange(preference.id, 'start', e.target.value)
                                }
                                className="w-full px-3 py-2 border rounded-md text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">End Time</Label>
                              <input
                                type="time"
                                value={preference.quiet_hours.end}
                                onChange={(e) => 
                                  handleQuietHoursChange(preference.id, 'end', e.target.value)
                                }
                                className="w-full px-3 py-2 border rounded-md text-sm"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Test Notification */}
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTestNotification(preference.type, 'email')}
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          Test Email
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTestNotification(preference.type, 'push')}
                        >
                          <Bell className="h-4 w-4 mr-2" />
                          Test Push
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feedback Tab */}
        <TabsContent value="feedback" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Feedback Notifications</CardTitle>
              <CardDescription>
                Configure notifications related to feedback submission
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {groupedPreferences.feedback?.map(preference => (
                <div key={preference.id} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{preference.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {preference.description}
                      </p>
                    </div>
                    <Switch
                      checked={preference.enabled}
                      onCheckedChange={(enabled) => 
                        handlePreferenceChange(preference.id, 'enabled', enabled)
                      }
                    />
                  </div>

                  {preference.enabled && (
                    <div className="ml-6 space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(preference.channels).map(([channel, enabled]) => {
                          const Icon = getChannelIcon(channel);
                          return (
                            <div key={channel} className="flex items-center space-x-2">
                              <Switch
                                checked={enabled}
                                onCheckedChange={(checked) => 
                                  handleChannelChange(preference.id, channel, checked)
                                }
                              />
                              <Icon className="h-4 w-4" />
                              <Label className="text-sm capitalize">{channel}</Label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Report Notifications</CardTitle>
              <CardDescription>
                Configure notifications for report generation and delivery
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {groupedPreferences.reports?.map(preference => (
                <div key={preference.id} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{preference.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {preference.description}
                      </p>
                    </div>
                    <Switch
                      checked={preference.enabled}
                      onCheckedChange={(enabled) => 
                        handlePreferenceChange(preference.id, 'enabled', enabled)
                      }
                    />
                  </div>

                  {preference.enabled && (
                    <div className="ml-6 space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(preference.channels).map(([channel, enabled]) => {
                          const Icon = getChannelIcon(channel);
                          return (
                            <div key={channel} className="flex items-center space-x-2">
                              <Switch
                                checked={enabled}
                                onCheckedChange={(checked) => 
                                  handleChannelChange(preference.id, channel, checked)
                                }
                              />
                              <Icon className="h-4 w-4" />
                              <Label className="text-sm capitalize">{channel}</Label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Notifications</CardTitle>
              <CardDescription>
                Configure system-wide notifications and announcements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {groupedPreferences.system?.map(preference => (
                <div key={preference.id} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{preference.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {preference.description}
                      </p>
                    </div>
                    <Switch
                      checked={preference.enabled}
                      onCheckedChange={(enabled) => 
                        handlePreferenceChange(preference.id, 'enabled', enabled)
                      }
                    />
                  </div>

                  {preference.enabled && (
                    <div className="ml-6 space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(preference.channels).map(([channel, enabled]) => {
                          const Icon = getChannelIcon(channel);
                          return (
                            <div key={channel} className="flex items-center space-x-2">
                              <Switch
                                checked={enabled}
                                onCheckedChange={(checked) => 
                                  handleChannelChange(preference.id, channel, checked)
                                }
                              />
                              <Icon className="h-4 w-4" />
                              <Label className="text-sm capitalize">{channel}</Label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
