'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Wand2, RefreshCw, Copy, CheckCircle } from 'lucide-react';

export default function AIChatFormBuilder({ onMarkdownGenerated }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm your AI form builder assistant. Describe the form you'd like to create, and I'll generate it for you. You can ask me to:\n\n• Create forms for specific purposes (e.g., 'Create a job application form')\n• Add or modify fields (e.g., 'Add a rating field for customer satisfaction')\n• Organize sections (e.g., 'Group contact info in one section')\n• Refine the form until it's perfect!\n\nWhat kind of form would you like to create?",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedMarkdown, setGeneratedMarkdown] = useState('');
  const [copied, setCopied] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai-form-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          currentMarkdown: generatedMarkdown,
        }),
      });

      if (!response.ok) throw new Error('Failed to get AI response');

      const data = await response.json();
      
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
        },
      ]);

      if (data.markdown) {
        setGeneratedMarkdown(data.markdown);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date(),
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const copyMarkdown = () => {
    navigator.clipboard.writeText(generatedMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const useMarkdown = () => {
    if (onMarkdownGenerated && generatedMarkdown) {
      onMarkdownGenerated(generatedMarkdown);
    }
  };

  const resetChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: "Hi! I'm your AI form builder assistant. Describe the form you'd like to create, and I'll generate it for you.",
        timestamp: new Date(),
      }
    ]);
    setGeneratedMarkdown('');
  };

  return (
    <div className="flex gap-6 h-[600px]">
      {/* Chat Interface */}
      <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between bg-gradient-to-r from-purple-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Bot className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">AI Form Builder</h3>
              <p className="text-sm text-gray-600">Chat to create your perfect form</p>
            </div>
          </div>
          <button
            onClick={resetChat}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <RefreshCw className="h-4 w-4" />
            Reset
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div
                className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                  message.role === 'user'
                    ? 'bg-purple-100 text-purple-600'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {message.role === 'user' ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
              </div>
              <div
                className={`flex-1 ${message.role === 'user' ? 'text-right' : ''}`}
              >
                <div
                  className={`inline-block px-4 py-2 rounded-2xl max-w-[80%] ${
                    message.role === 'user'
                      ? 'bg-purple-600 text-white'
                      : message.isError
                      ? 'bg-red-50 text-red-900 border border-red-200'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {message.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3">
              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                <Bot className="h-4 w-4 text-gray-600" />
              </div>
              <div className="bg-gray-100 rounded-2xl px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t bg-gray-50">
          <div className="flex gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your form or ask for changes..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              rows="2"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </form>
      </div>

      {/* Generated Markdown Preview */}
      <div className="w-96 flex flex-col bg-white rounded-xl shadow-sm border">
        <div className="px-6 py-4 border-b bg-gradient-to-r from-indigo-50 to-purple-50">
          <h3 className="font-semibold text-gray-900">Generated Form</h3>
          <p className="text-sm text-gray-600 mt-1">
            {generatedMarkdown ? 'Your form is ready!' : 'Form will appear here'}
          </p>
        </div>
        
        <div className="flex-1 p-4 overflow-y-auto">
          {generatedMarkdown ? (
            <pre className="text-xs font-mono bg-gray-50 p-4 rounded-lg overflow-x-auto">
              {generatedMarkdown}
            </pre>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Wand2 className="h-12 w-12 mb-3" />
              <p className="text-sm text-center">
                Start chatting to generate
                <br />
                your custom form
              </p>
            </div>
          )}
        </div>

        {generatedMarkdown && (
          <div className="p-4 border-t bg-gray-50 space-y-2">
            <button
              onClick={copyMarkdown}
              className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              {copied ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Markdown
                </>
              )}
            </button>
            <button
              onClick={useMarkdown}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
            >
              <Wand2 className="h-4 w-4" />
              Generate Form
            </button>
          </div>
        )}
      </div>
    </div>
  );
}