import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db } from "../firebase";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";
import Chatroom from "./chatroom";
import "../assets/styles/difficultyLevel.css";

const DifficultyLevel = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();

  // navigates to the game page with the selected difficulty level and groupId
  const handleDifficultySelection = (difficulty) => {
    if (!groupId) return;

    const group = doc(db, "groups", groupId);
    try {
      updateDoc(group, { difficulty, gameStarted: true });
    }
    catch (error) {
      console.error("Error updating difficulty level:", error);
    }
  };

  useEffect(() => {
    if (!groupId) return;

    const group = doc(db, "groups", groupId);
    const unsubscribe = onSnapshot(group, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const groupData = docSnapshot.data();

        if (!groupData.gameStarted) {
          navigate(`/difficultyLevel/${groupId}`);
        }
        // redirects all players in group to the game page
        else if (groupData.difficulty) {
          navigate(`/game/${groupId}/${groupData.difficulty}`);
        }
      }
    });
    return () => unsubscribe();
  }, [groupId, navigate]);

  return (
    <div className="background">
      <div className="container">
        <h2>Select Difficulty Level</h2>
        <p>Choose the difficulty level for your game:</p>

        <div className="buttons">
          <button className="difficulty-button easy"onClick={() => handleDifficultySelection("easy")}>Easy</button>
          <button className="difficulty-button medium" onClick={() => handleDifficultySelection("medium")}>Medium</button>
          <button className="difficulty-button hard" onClick={() => handleDifficultySelection("hard")}>Hard</button>
        </div>
      </div>
      <Chatroom />
    </div>
  );
};

export default DifficultyLevel;