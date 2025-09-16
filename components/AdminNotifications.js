'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, CheckCircle, X, Clock, AlertCircle } from 'lucide-react';

export default function AdminNotifications({ projectId }) {
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastCheck, setLastCheck] = useState(null);
  const modalRef = useRef(null);
  const buttonRef = useRef(null);

  // Handle click outside and ESC key
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
    };

    const handleEscKey = (event) => {
      if (event.key === 'Escape') {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [showNotifications]);

  useEffect(() => {
    // Check for new notifications every 30 seconds
    const checkNotifications = async () => {
      try {
        const response = await fetch(`/api/aloa-projects/${projectId}/notifications`);
        if (response.ok) {
          const data = await response.json();
          const newNotifications = data.notifications || [];
          
          // Update unread count
          const unread = newNotifications.filter(n => !n.read).length;
          setUnreadCount(unread);
          
          // Show toast for new completions since last check
          if (lastCheck) {
            const newCompletions = newNotifications.filter(n => 
              n.type === 'applet_completed' && 
              new Date(n.created_at) > new Date(lastCheck)
            );
            
            newCompletions.forEach(notification => {
              showToast(notification);
            });
          }
          
          setNotifications(newNotifications);
          setLastCheck(new Date().toISOString());
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    // Initial check
    checkNotifications();
    
    // Set up polling
    const interval = setInterval(checkNotifications, 30000);
    
    return () => clearInterval(interval);
  }, [projectId, lastCheck]);

  const showToast = (notification) => {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg flex items-center space-x-3 animate-slide-up z-50';
    toast.innerHTML = `
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <div>
        <p class="font-medium">${notification.title}</p>
        <p class="text-sm opacity-90">${notification.message}</p>
      </div>
    `;
    
    document.body.appendChild(toast);
    
    // Remove after 5 seconds
    setTimeout(() => {
      toast.classList.add('animate-slide-down');
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 5000);
  };

  const markAsRead = async (notificationId) => {
    try {
      await fetch(`/api/aloa-projects/${projectId}/notifications/${notificationId}/read`, {
        method: 'POST'
      });

      setNotifications(notifications.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      ));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    console.log('Mark all as read clicked');
    console.log('Current notifications:', notifications);
    console.log('Project ID:', projectId);

    try {
      // Mark all unread notifications as read
      const unreadNotifications = notifications.filter(n => !n.read);
      console.log('Unread notifications to mark:', unreadNotifications);

      if (unreadNotifications.length === 0) {
        console.log('No unread notifications to mark');
        return;
      }

      const responses = await Promise.all(
        unreadNotifications.map(async (n) => {
          const url = `/api/aloa-projects/${projectId}/notifications/${n.id}/read`;
          console.log('Marking as read:', url);
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          console.log('Response status:', response.status);
          return response;
        })
      );

      // Check if all requests were successful
      const allSuccessful = responses.every(r => r.ok);
      if (allSuccessful) {
        setNotifications(notifications.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
        console.log('All notifications marked as read');
      } else {
        console.error('Some notifications failed to mark as read');
        responses.forEach(async (r, i) => {
          if (!r.ok) {
            const error = await r.text();
            console.error(`Failed for notification ${unreadNotifications[i].id}:`, error);
          }
        });
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const clearAll = async () => {
    console.log('Clear all clicked');
    console.log('Project ID:', projectId);
    console.log('Notifications to clear:', notifications);

    try {
      // Clear all notifications
      const url = `/api/aloa-projects/${projectId}/notifications/clear`;
      console.log('Clearing at URL:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('Clear response status:', response.status);

      if (response.ok) {
        setNotifications([]);
        setUnreadCount(0);
        console.log('All notifications cleared successfully');
      } else {
        const errorText = await response.text();
        console.error('Failed to clear notifications:', errorText);
        try {
          const error = JSON.parse(errorText);
          console.error('Error details:', error);
        } catch (e) {
          console.error('Raw error:', errorText);
        }
      }
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'applet_completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'applet_started':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'needs_approval':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        ref={buttonRef}
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown */}
      {showNotifications && (
        <div
          ref={modalRef}
          className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Client Notifications</h3>
              <button
                onClick={() => setShowNotifications(false)}
                className="p-1 hover:bg-gray-100 rounded text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {notifications.length > 0 && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    markAllAsRead();
                  }}
                  disabled={unreadCount === 0}
                  className="flex-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Mark All As Read
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    clearAll();
                  }}
                  className="flex-1 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors"
                >
                  Clear All
                </button>
              </div>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      !notification.read ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => !notification.read && markAsRead(notification.id)}
                  >
                    <div className="flex items-start space-x-3">
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{notification.title}</p>
                        <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                        <p className="text-xs text-gray-400 mt-2">
                          {formatTime(notification.created_at)}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        @keyframes slide-down {
          from {
            transform: translateY(0);
            opacity: 1;
          }
          to {
            transform: translateY(100%);
            opacity: 0;
          }
        }
        
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}