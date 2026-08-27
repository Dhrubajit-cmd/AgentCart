import React, { useState, useRef, useEffect } from 'react';

interface AIChatProps {
  sessionID: string;
  onCartUpdate: () => void;
}

interface Message {
  role: 'user' | 'model';
  parts: string[];
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
  const [executedActions, setExecutedActions] = useState<ToolAction[]>([]);
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
    setExecutedActions([]); // Reset current turn actions list

    // Append user message locally
    const updatedMessages = [...messages, { role: 'user' as const, parts: [userText] }];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      // Map message history to format expected by backend (excl system instructions)
      // Standardize parts as arrays
      const historyPayload = messages.map((msg) => ({
        role: msg.role,
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

      // Append model reply
      setMessages((prev) => [...prev, { role: 'model', parts: [data.reply] }]);
      
      // Store tool actions executed
      if (data.actions && data.actions.length > 0) {
        setExecutedActions(data.actions);
        
        // If the AI added items to the cart or cleared cart, update the cart drawer totals!
        const modifiedCart = data.actions.some(
          (act) => act.tool_name === 'add_to_cart' || act.tool_name === 'show_cart'
        );
        if (modifiedCart) {
          onCartUpdate();
        }
      }
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
        return `🔍 Searched catalog for "${act.args?.query || ''}"`;
      case 'add_to_cart':
        return `✅ Added product to guest cart`;
      case 'show_cart':
        return `📋 Checked shopping cart status`;
      case 'request_checkout':
        return `💳 Prepared standard checkout order`;
      default:
        return `⚙️ Run command: ${act.tool_name}`;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      
      {/* AI Chat Header */}
      <div className="bg-blue-50 border-b border-blue-100 p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-sm">
            🤖
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 leading-tight">AI Assistant</h3>
            <span className="text-[10px] text-green-600 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block animate-pulse"></span>
              Live Agentic Mode
            </span>
          </div>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-grow overflow-y-auto p-4 space-y-3 bg-slate-50/50">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed shadow-sm ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white font-medium rounded-br-none'
                  : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-none'
              }`}
            >
              {msg.parts.join('\n')}
            </div>
          </div>
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 text-slate-400 rounded-xl rounded-bl-none px-4 py-3 text-xs flex items-center gap-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        {/* Executed System Actions log inside chat panel */}
        {executedActions.length > 0 && (
          <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-2.5 space-y-1.5 my-2">
            <span className="text-[9px] uppercase font-bold text-blue-500 tracking-wider block mb-1">
              System Action logs:
            </span>
            {executedActions.map((act, idx) => (
              <div key={idx} className="text-[10px] text-slate-600 font-medium font-sans flex items-center gap-1.5">
                {getFriendlyActionLabel(act)}
              </div>
            ))}
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 bg-white shrink-0 flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={isLoading}
          placeholder="Ask for travel headphones under ₹3,000..."
          className="flex-grow bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
        />
        <button
          type="submit"
          disabled={!inputValue.trim() || isLoading}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold px-4 py-2 rounded-lg text-xs transition shrink-0 cursor-pointer shadow-sm"
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default AIChat;
