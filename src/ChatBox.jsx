import React, { useState, useRef, useEffect } from 'react';
import { supabase } from './supabaseClient';

function ChatBox() {
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const chatContainerRef = useRef(null);

  // auto-scroll to bottom when messages update
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchAIResponse = async (userInput) => {
    try {
      const { data, error } = await supabase.functions.invoke('get-response', {
        body: JSON.stringify({ query: userInput }),
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        }
      });

      if (error) {
        console.error("Error fetching AI response:", error);
        return "Sorry, something went wrong. Please try again.";
      }

      return data.response || "No relevant information found.";
    } catch (error) {
      console.error("Error:", error);
      return "Sorry, something went wrong. Please try again.";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    // Add user message
    setMessages(prevMessages => [
      ...prevMessages,
      { text: userInput, type: 'human' },
    ]);

    setUserInput(''); // Clear input

    // Fetch AI response
    const aiResponse = await fetchAIResponse(userInput);

    // Add AI message
    setMessages(prevMessages => [
      ...prevMessages,
      { text: aiResponse, type: 'ai' },
    ]);
  };

  return (
    <div className="chat-container">
      <div
        id="chatbot-conversation-container"
        ref={chatContainerRef}
        className="conversation-container"
      >
        {messages.map((message, index) => (
          <div key={index} className={`speech speech-${message.type}`}>
            {message.text}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <input
          id="user-input"
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Type your message..."
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}

export default ChatBox;
