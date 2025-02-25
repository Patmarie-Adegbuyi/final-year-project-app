import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, addDoc, orderBy, onSnapshot, query, serverTimestamp } from "firebase/firestore";
import { useParams } from "react-router-dom";
import "../assets/styles/chatroom.css"

const Chatroom = () => {
    const { groupId: urlGroupId } = useParams();
    const storedGroupId = sessionStorage.getItem("groupId");
    const groupId = urlGroupId || storedGroupId;
  
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const username = sessionStorage.getItem("username") || "Anonymous";

  useEffect(() => {
    if (!groupId) return;

    const messages = collection(db, `groups/${groupId}/messages`);
    const q = query(messages, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(msgs);
    });
    return () => unsubscribe();
  }, [groupId]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    await addDoc(collection(db, `groups/${groupId}/messages`), {
      username,
      text: input,
      timestamp: serverTimestamp()
    });

    setInput("");  // clears input after sending
  };

  return (
    <div className="chat-container">
      {/* Chat toggle button */}
      <button className="chat-toggle" onClick={() => setIsOpen(!isOpen)}>
        💬 Chat
      </button>
      
      {isOpen && (
        <div className="chat-room">
          <div className="chat-header">
            <h3>Group Chat</h3>
            <button className="close-btn" onClick={() => setIsOpen(false)}>✖</button>
          </div>

          <div className="chat-messages">
            {messages.map(msg => (
              <p key={msg.id}><strong>{msg.username}:</strong> {msg.text}</p>
            ))}
          </div>

          <div className="chat-input">
            <input 
              type="text" 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              placeholder="Say something to your team members" 
            />
            <button onClick={sendMessage}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chatroom;