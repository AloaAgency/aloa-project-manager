'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, Sparkles, X, ChevronDown, Loader2 } from 'lucide-react';

export default function ProjectInsightsChat({ projectId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm your project insights assistant. I can analyze all the data we've collected about this project. Ask me questions like:\n\n• What are the client's design preferences?\n• What functionality do they need?\n• Are there any concerns or conflicts to address?\n• What additional information should we gather?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const suggestedQuestions = [
    "What are the client's color preferences?",
    "What tone of voice should we use?",
    "What functionality have they requested?",
    "Are there any concerns to address?"
  ];

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(`/api/project-knowledge/${projectId}/insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ question: input })
      });

      if (!response.ok) throw new Error('Failed to get insights');

      const data = await response.json();

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.answer,
        sources: data.sources,
        timestamp: new Date()
      }]);
    } catch (error) {

      let errorMessage = 'Sorry, I encountered an error analyzing the project data.';

      // Try to get more specific error message from response
      if (error.message) {
        errorMessage += ` Error: ${error.message}`;
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: errorMessage + '\n\nIf this persists, please check:\n1. The database schema is properly set up (run fix_knowledge_importance_column.sql)\n2. The Anthropic API key is configured\n3. The project has valid data',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (question) => {
    setInput(question);
    setTimeout(() => handleSend(), 100);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-full shadow-lg hover:from-purple-700 hover:to-blue-700 transition-all z-40 flex items-center gap-2"
        title="Project Insights"
      >
        <Sparkles className="w-5 h-5" />
        <MessageCircle className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-t-2xl flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          <h3 className="font-bold">Project Insights AI</h3>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="hover:bg-white/20 rounded-lg p-1 transition-colors"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="whitespace-pre-wrap text-sm">{message.content}</p>
              {message.sources && message.sources.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-300 text-xs opacity-70">
                  <p className="font-semibold mb-1">Sources:</p>
                  <ul className="space-y-0.5">
                    {message.sources.slice(0, 3).map((source, idx) => (
                      <li key={idx} className="truncate">
                        • {source}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {messages.length === 1 && (
        <div className="px-4 pb-2">
          <p className="text-xs text-gray-500 mb-2">Suggested questions:</p>
          <div className="space-y-1">
            {suggestedQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(question)}
                className="w-full text-left text-xs px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about this project..."
            className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}