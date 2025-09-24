'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send,
  Paperclip,
  MoreVertical,
  Edit2,
  Trash2,
  Check,
  X,
  MessageSquare,
  User,
  Users
} from 'lucide-react';

export default function ChatInterface({ projectId, currentUser, isClientView = false }) {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [showChatList, setShowChatList] = useState(true);
  const messagesEndRef = useRef(null);
  const messageContainerRef = useRef(null);

  // Fetch conversations
  useEffect(() => {
    if (projectId) {
      fetchConversations();
    }
  }, [projectId]);

  // Fetch messages when conversation selected
  useEffect(() => {
    if (selectedConversation) {
      fetchMessages();
      setShowChatList(false); // Hide list on mobile when conversation selected
    }
  }, [selectedConversation]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const response = await fetch(`/api/chat/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);

        // Auto-select first conversation or create default one
        if (!data.conversations || data.conversations.length === 0) {
          await createDefaultConversation();
        } else if (!selectedConversation) {
          setSelectedConversation(data.conversations[0]);
        }
      } else {
        console.error('Failed to fetch conversations:', response.status);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const createDefaultConversation = async () => {
    try {
      const response = await fetch(`/api/chat/${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Project Discussion',
          description: 'General project communication'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setConversations([data.conversation]);
        setSelectedConversation(data.conversation);
        return data.conversation;
      } else {
        const error = await response.text();
        console.error('Failed to create conversation:', response.status, error);
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const fetchMessages = async () => {
    if (!selectedConversation) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/chat/conversation/${selectedConversation.id}/messages`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || sending) return;

    setSending(true);
    const tempMessage = {
      id: `temp-${Date.now()}`,
      content: newMessage,
      sender_id: currentUser.id,
      sender: currentUser,
      created_at: new Date().toISOString(),
      is_temp: true
    };

    // Optimistically add message
    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');

    try {
      const response = await fetch(`/api/chat/conversation/${selectedConversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage })
      });

      if (response.ok) {
        const data = await response.json();
        // Replace temp message with real one
        setMessages(prev => prev.map(msg =>
          msg.id === tempMessage.id ? data.message : msg
        ));

        // Update conversation list
        fetchConversations();
      } else {
        // Remove temp message on error
        setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
        setNewMessage(newMessage); // Restore message
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
      setNewMessage(newMessage);
    } finally {
      setSending(false);
    }
  };

  const editMessage = async (messageId) => {
    if (!editContent.trim()) return;

    try {
      const response = await fetch(`/api/chat/conversation/${selectedConversation.id}/messages`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, content: editContent })
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => prev.map(msg =>
          msg.id === messageId ? data.message : msg
        ));
        setEditingMessage(null);
        setEditContent('');
      }
    } catch (error) {
      console.error('Error editing message:', error);
    }
  };

  const deleteMessage = async (messageId) => {
    if (!confirm('Delete this message?')) return;

    try {
      const response = await fetch(
        `/api/chat/conversation/${selectedConversation.id}/messages?messageId=${messageId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const getUserRole = (role) => {
    if (role?.includes('client')) return 'Client';
    return 'Agency';
  };

  const getUserColor = (role) => {
    if (role?.includes('client')) return 'text-blue-600';
    return 'text-purple-600';
  };

  return (
    <div className="flex h-[600px] bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Conversation List */}
      <div className={`${showChatList ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-80 border-r bg-gray-50`}>
        <div className="p-4 border-b bg-white">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Conversations
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-gray-600 mb-4">No conversations yet</p>
              <button
                onClick={createDefaultConversation}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Start New Conversation
              </button>
            </div>
          ) : (
            conversations.map(conv => (
            <button
              key={conv.id}
              onClick={() => setSelectedConversation(conv)}
              className={`w-full p-4 text-left border-b hover:bg-white transition-colors ${
                selectedConversation?.id === conv.id ? 'bg-white shadow-sm' : ''
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <h4 className="font-medium text-gray-900">{conv.title}</h4>
                {conv.unread_count > 0 && (
                  <span className="px-2 py-0.5 text-xs bg-blue-500 text-white rounded-full">
                    {conv.unread_count}
                  </span>
                )}
              </div>
              {conv.last_message && (
                <div className="text-sm text-gray-600 truncate">
                  <span className={getUserColor(conv.last_message.sender?.role)}>
                    {conv.last_message.sender?.full_name}:
                  </span>{' '}
                  {conv.last_message.content}
                </div>
              )}
              <div className="text-xs text-gray-500 mt-1">
                {conv.last_message_at ? formatTimestamp(conv.last_message_at) : 'No messages yet'}
              </div>
            </button>
          ))
          )}
        </div>
      </div>

      {/* Message Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Header */}
            <div className="p-4 border-b bg-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowChatList(true)}
                  className="md:hidden text-gray-600 hover:text-gray-900"
                >
                  ←
                </button>
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedConversation.title}</h3>
                  <p className="text-sm text-gray-600">
                    {selectedConversation.participants?.length || 0} participants
                  </p>
                </div>
              </div>
              <button className="text-gray-600 hover:text-gray-900">
                <MoreVertical className="h-5 w-5" />
              </button>
            </div>

            {/* Messages */}
            <div
              ref={messageContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-4"
            >
              {loading ? (
                <div className="text-center text-gray-500 py-8">Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                messages.map((message, idx) => {
                  const isOwn = message.sender_id === currentUser.id;
                  const showAvatar = idx === 0 || messages[idx - 1].sender_id !== message.sender_id;

                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${
                        !showAvatar ? 'ml-10' : ''
                      }`}
                    >
                      <div className={`flex ${isOwn ? 'flex-row-reverse' : 'flex-row'} gap-2 max-w-[70%]`}>
                        {showAvatar && (
                          <div className="flex-shrink-0">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white text-sm ${
                              isOwn ? 'bg-blue-500' : 'bg-purple-500'
                            }`}>
                              {message.sender?.full_name?.charAt(0).toUpperCase() || '?'}
                            </div>
                          </div>
                        )}

                        <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                          {showAvatar && (
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-gray-900">
                                {message.sender?.full_name || 'Unknown'}
                              </span>
                              <span className={`text-xs ${getUserColor(message.sender?.role)}`}>
                                {getUserRole(message.sender?.role)}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatTimestamp(message.created_at)}
                              </span>
                            </div>
                          )}

                          <div className={`relative group ${isOwn ? 'pr-2' : 'pl-2'}`}>
                            {editingMessage === message.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={editContent}
                                  onChange={(e) => setEditContent(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') editMessage(message.id);
                                    if (e.key === 'Escape') {
                                      setEditingMessage(null);
                                      setEditContent('');
                                    }
                                  }}
                                  className="px-3 py-2 border rounded-lg"
                                  autoFocus
                                />
                                <button
                                  onClick={() => editMessage(message.id)}
                                  className="p-1 text-green-600 hover:text-green-700"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingMessage(null);
                                    setEditContent('');
                                  }}
                                  className="p-1 text-red-600 hover:text-red-700"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <>
                                <div className={`px-4 py-2 rounded-lg ${
                                  isOwn
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-100 text-gray-900'
                                }`}>
                                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                                  {message.is_edited && (
                                    <p className={`text-xs mt-1 ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
                                      (edited)
                                    </p>
                                  )}
                                </div>

                                {isOwn && !message.is_temp && (
                                  <div className="absolute -left-20 top-0 hidden group-hover:flex items-center gap-1">
                                    <button
                                      onClick={() => {
                                        setEditingMessage(message.id);
                                        setEditContent(message.content);
                                      }}
                                      className="p-1 text-gray-600 hover:text-gray-900"
                                    >
                                      <Edit2 className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() => deleteMessage(message.id)}
                                      className="p-1 text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={sendMessage} className="p-4 border-t bg-white">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="p-2 text-gray-600 hover:text-gray-900"
                  title="Attach file"
                >
                  <Paperclip className="h-5 w-5" />
                </button>

                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={sending}
                />

                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className={`p-2 rounded-full transition-colors ${
                    newMessage.trim() && !sending
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a conversation to start messaging
          </div>
        )}
      </div>
    </div>
  );
}