import React, { useState, useRef, useEffect } from 'react';

interface AIChatProps {
  sessionID: string;
  onCartUpdate: () => void;
}

interface Message {
  role: 'user' | 'model' | 'system';
  parts: string[];
  isAction?: boolean;
}

interface ToolAction {
  tool_name: string;
  args: any;
  result: string;
}

interface ChatReplyPayload {
  reply: string;
  actions: ToolAction[];
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// Simple parser to format basic markdown (bold, bullet lists, headers) into clean JSX
const formatMessageText = (text: string) => {
  const lines = text.split('\n');
  return lines.map((line, idx) => {
    let cleanLine = line.trim();
    if (!cleanLine) return <div key={idx} className="h-2" />;

    // 1. Format headers (e.g. ### Header)
    if (cleanLine.startsWith('###')) {
      const headerText = cleanLine.replace(/^###\s*/, '');
      return (
        <h4 key={idx} className="text-xs font-bold text-slate-800 mt-2 mb-1 flex items-center gap-1">
          {parseBoldText(headerText)}
        </h4>
      );
    }

    // 2. Format bullet points (e.g. * Item or - Item)
    if (cleanLine.startsWith('*') || cleanLine.startsWith('-')) {
      const listText = cleanLine.replace(/^[\*\-]\s*/, '');
      return (
        <div key={idx} className="pl-4 py-0.5 text-xs text-slate-700 flex items-start gap-1.5 leading-relaxed">
          <span className="text-blue-500 mt-1.5 shrink-0 w-1 h-1 rounded-full bg-blue-500" />
          <span className="flex-grow">{parseBoldText(listText)}</span>
        </div>
      );
    }

    // 3. Normal paragraph
    return (
      <p key={idx} className="text-xs text-slate-700 leading-relaxed mb-1.5">
        {parseBoldText(cleanLine)}
      </p>
    );
  });
};

// Helper to replace **text** with <strong> tags
const parseBoldText = (text: string) => {
  const parts = text.split(/\*\*([\s\S]*?)\*\*/g);
  return parts.map((part, index) => {
    // Odd indices represent the text inside **
    if (index % 2 === 1) {
      return (
        <strong key={index} className="font-bold text-slate-900">
          {part}
        </strong>
      );
    }
    return part;
  });
};

const AIChat: React.FC<AIChatProps> = ({ sessionID, onCartUpdate }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      parts: [
        "Hi! I'm your TechNest Shopping Assistant. Ask me to find accessories, check your cart, or set up checkouts!",
      ],
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userText = inputValue.trim();
    setInputValue('');

    // Append user message locally
    const nextMessages = [...messages, { role: 'user' as const, parts: [userText] }];
    setMessages(nextMessages);
    setIsLoading(true);

    try {
      // Map message history to format expected by backend (excl system actions)
      // Standardize parts as arrays, exclude system logs to keep model context clean
      const historyPayload = messages
        .filter((msg) => msg.role !== 'system')
        .map((msg) => ({
          role: msg.role as 'user' | 'model',
          parts: msg.parts,
        }));

      const res = await fetch(`${API_URL}/api/buyer/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionID,
          message: userText,
          history: historyPayload,
        }),
      });

      if (!res.ok) {
        throw new Error('Could not connect to AI buyer engine.');
      }

      const data: ChatReplyPayload = await res.json();

      // Collect system log messages from actions
      const systemLogs: Message[] = [];
      if (data.actions && data.actions.length > 0) {
        data.actions.forEach((act) => {
          systemLogs.push({
            role: 'system',
            isAction: true,
            parts: [getFriendlyActionLabel(act)],
          });
        });

        // Trigger parent state update if database cart items changed
        const modifiedCart = data.actions.some(
          (act) => act.tool_name === 'add_to_cart' || act.tool_name === 'show_cart'
        );
        if (modifiedCart) {
          onCartUpdate();
        }
      }

      // Append system logs then the final model response bubble
      setMessages((prev) => [
        ...prev,
        ...systemLogs,
        { role: 'model', parts: [data.reply] },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          parts: ["Sorry, I encountered an error communicating with the agent. Please try again."],
        },
      ]);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const getFriendlyActionLabel = (act: ToolAction) => {
    switch (act.tool_name) {
      case 'search_catalog':
        return `🔍 Catalog Search: "${act.args?.query || ''}"`;
      case 'add_to_cart':
        return `🛒 Cart Operation: Added item successfully`;
      case 'show_cart':
        return `📋 Cart Status: Inspected customer cart`;
      case 'request_checkout':
        return `💳 Checkout: Prepared payment order`;
      default:
        return `⚙️ Action: ${act.tool_name}`;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-md transition-all duration-300">
      
      {/* AI Chat Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center text-white text-base shadow-inner backdrop-blur-md">
            🤖
          </div>
          <div>
            <h3 className="text-xs font-extrabold text-white tracking-wide uppercase">TechNest AI Buyer</h3>
            <span className="text-[10px] text-blue-200 font-semibold flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-ping"></span>
              Gemini 3.6 Agent Active
            </span>
          </div>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-slate-50/70 scrollbar-thin">
        {messages.map((msg, idx) => {
          if (msg.role === 'system') {
            return (
              <div key={idx} className="flex justify-center my-1 animate-fadeIn">
                <div className="bg-slate-100/90 text-slate-500 font-medium font-sans border border-slate-200/50 rounded-full px-3 py-1 text-[9px] flex items-center gap-1.5 shadow-sm">
                  {msg.parts[0]}
                </div>
              </div>
            );
          }

          const isUser = msg.role === 'user';
          return (
            <div
              key={idx}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-slideIn`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-sm transition-all ${
                  isUser
                    ? 'bg-blue-600 text-white font-medium rounded-br-none'
                    : 'bg-white text-slate-800 border border-slate-100 rounded-bl-none'
                }`}
              >
                {isUser ? (
                  <p className="whitespace-pre-wrap">{msg.parts.join('\n')}</p>
                ) : (
                  <div className="space-y-0.5">{formatMessageText(msg.parts.join('\n'))}</div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex justify-start animate-pulse">
            <div className="bg-white border border-slate-100 text-slate-400 rounded-2xl rounded-bl-none px-4 py-3 text-xs flex items-center gap-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSendMessage} className="p-3.5 border-t border-slate-100 bg-white shrink-0 flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={isLoading}
          placeholder="Search headphones under ₹3,000..."
          className="flex-grow bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all duration-200"
        />
        <button
          type="submit"
          disabled={!inputValue.trim() || isLoading}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition duration-200 shrink-0 cursor-pointer shadow-sm active:scale-95"
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default AIChat;
