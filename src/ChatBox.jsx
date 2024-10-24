import React, { useState, useRef, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

function ChatBox() {
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const chatContainerRef = useRef(null);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  const isLocalDevelopment = true;

  const supabase = supabaseUrl && supabaseAnonKey 
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

  useEffect(() => {
    if (!supabaseUrl || !supabaseAnonKey) {
      setError('Supabase configuration is missing.');
    }
  }, [supabaseUrl, supabaseAnonKey]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading) return;

    setMessages(prevMessages => [...prevMessages, 
      { text: userInput, type: 'human' }
    ]);

    setIsLoading(true);
    setError(null);

    try {
      let data;
      
      if (isLocalDevelopment) {
        const response = await fetch('http://localhost:54321/functions/v1/get-response', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'apikey': supabaseAnonKey
          },
          body: JSON.stringify({ query: userInput }),
          mode: 'cors',
          credentials: 'omit'
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        data = await response.json();
      } else {
        const { data: supabaseData, error: supabaseError } = await supabase.functions.invoke('get-response', {
          body: { query: userInput }
        });
        if (supabaseError) throw supabaseError;
        data = supabaseData;
      }

      setMessages(prevMessages => [...prevMessages, 
        { 
          text: data.response, 
          type: 'ai',
          sources: data.sources
        }
      ]);
    } catch (err) {
      console.error('Error:', err);
      setMessages(prevMessages => [...prevMessages, 
        { 
          text: "Sorry, I encountered an error processing your request.", 
          type: 'ai' 
        }
      ]);
      setError(err.message);
    } finally {
      setIsLoading(false);
      setUserInput('');
    }
  };

  if (error) {
    return (
      <div className="chat-container">
        <div className="error-message">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div 
        ref={chatContainerRef}
        className="conversation-container"
      >
        {messages.map((message, index) => (
          <div key={index} className={`speech speech-${message.type}`}>
            {message.text}
            {message.sources && (
              <div className="sources text-xs mt-2 opacity-70">
                <p>Sources:</p>
                {message.sources.map((source, i) => (
                  <div key={i} className="mt-1 pl-2 border-l-2">
                    {source.pageContent}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="speech speech-ai">
            Thinking...
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Type your message..."
          disabled={isLoading}
          className="chat-input"
        />
        <button 
          type="submit" 
          disabled={isLoading || !userInput.trim()}
          className="chat-button"
        >
          {isLoading ? '...' : 'Send'}
        </button>
      </form>
    </div>
  );
}

export default ChatBox;
