import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { addDoc, updateDoc, collection } from "firebase/firestore";
import "../assets/styles/usernameInput.css";

const UsernameInput = () => {
    const [username, setUsername] = useState("");
    const navigate = useNavigate();
  
    const handleJoin = async () => {
      if (username.trim() === "") {
        alert("Please enter your name.");
        return;
      }
  
      try {
        // creates a session ID that's unique for each tab/window
        const sessionId = `${username}-${Date.now()}`;

        const newPlayer = await addDoc(collection(db, "players"), {
          username,
          group: null,
          status: "waiting",
          sessionID: sessionId,
        });
        
        await updateDoc(newPlayer, {playerID: newPlayer.id });
  
        sessionStorage.setItem("sessionId", sessionId);
  
        // navigates player to the waiting page, passing player ID as a URL parameter
        navigate(`/waiting/${newPlayer.id}`, { state: { sessionId } });
      } catch (error) {
        alert("Something went wrong. Please try again.");
      }
    };
  
    return (
      <div className="background">
        <div className="form-container">
          <h1>Maze Escape</h1>
          <div className="textbox">
            <input type="text" placeholder="Enter your name here" value={username} onChange={(e) => setUsername(e.target.value)}/>
          </div>
          <button className="join-button" onClick={handleJoin}>Join Game</button>
        </div>
      </div>
    );
};
  
export default UsernameInput;