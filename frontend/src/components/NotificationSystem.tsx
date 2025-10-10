/**
 * Notification System Component
 */
import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useUI, useUnreadCount } from '../stores/useAppStore';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '../lib/utils';

const NotificationIcon = ({ type }: { type: string }) => {
  const iconProps = { className: "h-4 w-4" };
  
  switch (type) {
    case 'success':
      return <CheckCircle {...iconProps} className="text-green-500" />;
    case 'error':
      return <AlertCircle {...iconProps} className="text-red-500" />;
    case 'warning':
      return <AlertTriangle {...iconProps} className="text-yellow-500" />;
    case 'info':
    default:
      return <Info {...iconProps} className="text-blue-500" />;
  }
};

const NotificationItem: React.FC<{
  notification: any;
  onRemove: (id: string) => void;
  onMarkRead: (id: string) => void;
}> = ({ notification, onRemove, onMarkRead }) => {
  const { id, type, title, message, timestamp, read } = notification;

  const handleMarkRead = () => {
    if (!read) {
      onMarkRead(id);
    }
  };

  const handleRemove = () => {
    onRemove(id);
  };

  return (
    <Card 
      className={cn(
        "mb-2 cursor-pointer transition-all duration-200 hover:shadow-md",
        !read && "border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-900/20"
      )}
      onClick={handleMarkRead}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <NotificationIcon type={type} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                  {title}
                </h4>
                {!read && (
                  <Badge variant="secondary" className="text-xs">
                    New
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {message}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {new Date(timestamp).toLocaleString()}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleRemove();
            }}
            className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export const NotificationSystem: React.FC = () => {
  const {
    notifications,
    addNotification,
    removeNotification,
    markNotificationRead,
    clearNotifications,
  } = useUI();
  
  const unreadCount = useUnreadCount();

  // Auto-mark notifications as read after 5 seconds
  useEffect(() => {
    const unreadNotifications = notifications.filter(n => !n.read);
    
    if (unreadNotifications.length > 0) {
      const timer = setTimeout(() => {
        unreadNotifications.forEach(notification => {
          markNotificationRead(notification.id);
        });
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [notifications, markNotificationRead]);

  const handleMarkAllRead = () => {
    notifications.forEach(notification => {
      if (!notification.read) {
        markNotificationRead(notification.id);
      }
    });
  };

  const handleClearAll = () => {
    clearNotifications();
  };

  if (notifications.length === 0) {
    return (
      <Card className="w-80">
        <CardContent className="p-6 text-center">
          <Info className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No notifications yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-80">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </h3>
          <div className="flex space-x-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
                className="text-xs"
              >
                Mark all read
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="text-xs"
            >
              Clear all
            </Button>
          </div>
        </div>
      </div>
      
      <ScrollArea className="h-96">
        <div className="p-4">
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onRemove={removeNotification}
              onMarkRead={markNotificationRead}
            />
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
};

// Toast notification hook
export const useToast = () => {
  const { addNotification } = useUI();

  const toast = (notification: {
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  }) => {
    addNotification(notification);
  };

  return {
    toast,
    success: (title: string, message: string) => 
      toast({ type: 'success', title, message }),
    error: (title: string, message: string) => 
      toast({ type: 'error', title, message }),
    warning: (title: string, message: string) => 
      toast({ type: 'warning', title, message }),
    info: (title: string, message: string) => 
      toast({ type: 'info', title, message }),
  };
};

export default NotificationSystem;
