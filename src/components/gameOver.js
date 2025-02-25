import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import "../assets/styles/gameOver.css";

const GameOver = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [stepsTaken, setStepsTaken] = useState(null);

  // fetchs steps taken from Firestore
  useEffect(() => {
    const fetchSteps = async () => {
      if (groupId) {
        const group = doc(db, "groups", groupId);
        const groupDoc = await getDoc(group);
        if (groupDoc.exists()) {
          const data = groupDoc.data();
          setStepsTaken(data.stepsTaken);
        }
      }
    };
    fetchSteps();
  }, [groupId]);

  return (
    <div className="background">
      <div className="game-over-container">
      <h2 className="game-over-title">🎉 Congratulations! 🎉</h2>
      <p className="game-over-message">Your team successfully helped the mouse find the cheese!</p>
      <p className="game-over-steps">
        <strong>Total Steps Taken: </strong> 
        {stepsTaken !== null ? stepsTaken : "Loading..."}
      </p>
      <button className="game-over-button" onClick={() => navigate("/")}>
        Return to Home
      </button>
    </div>
    </div>
  );
};

export default GameOver;