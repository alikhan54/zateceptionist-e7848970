import { useState } from 'react';
import { Bell, CheckCheck, Settings, Trash2, MessageSquare, Calendar, TrendingUp, AlertCircle, Info, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { formatSmartDate } from '@/lib/utils';
import { useNotifications } from '@/hooks/useNotifications';

type DisplayType = 'message' | 'appointment' | 'deal' | 'alert' | 'info';

const typeIcons: Record<DisplayType, React.ReactNode> = {
  message: <MessageSquare className="h-4 w-4" />,
  appointment: <Calendar className="h-4 w-4" />,
  deal: <TrendingUp className="h-4 w-4" />,
  alert: <AlertCircle className="h-4 w-4" />,
  info: <Info className="h-4 w-4" />,
};

const typeColors: Record<DisplayType, string> = {
  message: 'bg-blue-500/10 text-blue-500',
  appointment: 'bg-green-500/10 text-green-500',
  deal: 'bg-yellow-500/10 text-yellow-500',
  alert: 'bg-red-500/10 text-red-500',
  info: 'bg-purple-500/10 text-purple-500',
};

// Map notification_type / type from DB to display type
function mapToDisplayType(notification: any): DisplayType {
  const category = notification.category;
  if (category === 'message') return 'message';
  if (category === 'appointment') return 'appointment';
  if (category === 'deal' || category === 'lead') return 'deal';
  if (category === 'system' || category === 'task') return 'alert';

  const type = notification.type;
  if (type === 'error' || type === 'warning') return 'alert';
  if (type === 'success') return 'deal';
  return 'info';
}

export function NotificationCenter() {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
  } = useNotifications({ limit: 50 });

  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const navigate = useNavigate();

  const filteredNotifications = filter === 'unread'
    ? notifications.filter(n => !n.is_read)
    : notifications;

  const handleNotificationClick = (notification: any) => {
    if (!notification.is_read) {
      markAsRead.mutate(notification.id);
    }
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span className="text-base font-semibold">Notifications</span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className={cn("text-xs h-7", filter === 'all' && 'bg-muted')}
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn("text-xs h-7", filter === 'unread' && 'bg-muted')}
              onClick={() => setFilter('unread')}
            >
              Unread
            </Button>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-sm text-muted-foreground">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => {
              const displayType = mapToDisplayType(notification);
              return (
                <DropdownMenuItem
                  key={notification.id}
                  className={cn(
                    "flex items-start gap-3 p-3 cursor-pointer focus:bg-muted/50",
                    !notification.is_read && "bg-primary/5"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", typeColors[displayType])}>
                    {typeIcons[displayType]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn("text-sm font-medium truncate", !notification.is_read && "font-semibold")}>
                        {notification.title}
                      </p>
                      {!notification.is_read && (
                        <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {notification.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {formatSmartDate(notification.created_at)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification.mutate(notification.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </DropdownMenuItem>
              );
            })
          )}
        </ScrollArea>

        <DropdownMenuSeparator />
        <div className="flex items-center justify-between p-2">
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => markAllAsRead.mutate()}
              disabled={unreadCount === 0}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 text-destructive hover:text-destructive"
              onClick={() => clearAllNotifications.mutate()}
              disabled={notifications.length === 0}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear all
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7"
            onClick={() => navigate('/settings/notifications')}
          >
            <Settings className="h-3 w-3 mr-1" />
            Settings
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
