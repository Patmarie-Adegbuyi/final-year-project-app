import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { doc, updateDoc, runTransaction, onSnapshot, getDocs, collection } from "firebase/firestore";
import { generateMaze } from "../utils/mazeUtils";
import Chatroom from "./chatroom";
import "../assets/styles/game.css"

const Game = () => {
  const { difficulty, groupId } = useParams();
  const canvasRef = useRef(null);
  const [mazeData, setMazeData] = useState(null);
  const [groupPosition, setGroupPosition] = useState({ row: 0, col: 0 }); // shared starting position
  const [groupData, setGroupData] = useState(null);
  const [steps, setSteps] = useState(0);
  const [playerId, setPlayerId] = useState(null);
  const [player, setPlayer] = useState(null);
  const [facingDirection, setFacingDirection] = useState("right");
  const navigate = useNavigate();

  useEffect(() => {
    const sessionId = sessionStorage.getItem("sessionId");

    if (!sessionId) {
      console.warn("Session ID missing. Redirecting to homepage.");
      navigate("/");
      return;
    }

    const players = collection(db, "players");
    const unsubscribe = onSnapshot(players, (snapshot) => {
      let foundPlayer = null;
      snapshot.forEach((doc) => {
        if (doc.data().sessionID === sessionId) {
          foundPlayer = doc;
        }
      });
  
      if (foundPlayer) {
        setPlayer(foundPlayer.data());
        setPlayerId(foundPlayer.id);
      }
      else {
        console.warn("Player not found in Firestore. Redirecting to homepage");
        navigate("/");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // fetchs maze and group data
  useEffect(() => {
    const fetchMaze = async () => {
      if (!groupId) return;
      const maze = doc(db, `mazes/${groupId}`);

      try {
        await runTransaction(db, async (transaction) => {
          const mazeDoc = await transaction.get(maze);
          if (!mazeDoc.exists() || !mazeDoc.data().mazeGenerated) {
            const newMaze = await generateMaze(difficulty, groupId);
            transaction.set(maze, { ...newMaze, mazeGenerated: true }, { merge: true });
            setMazeData(newMaze);
          } else {
            setMazeData(mazeDoc.data());
          }
        });
      }
      catch (error) {
        console.error("Error fetching maze:", error);
      }
    };
    fetchMaze();
  }, [difficulty, groupId]);

  useEffect(() => {
    if (!groupId) return;

    const group = doc(db, "groups", groupId);
    const unsubscribe = onSnapshot(group, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        setGroupData(data);
        if (data.position) {
          setGroupPosition(data.position);
        }

        // syncs steps from Firestore
        if (data.stepsTaken !== undefined) {
          setSteps(data.stepsTaken);
        }

        // if gameStarted is false, redirects all players to difficulty level selection page
        if (data.gameStarted === false) {
          navigate(`/difficultyLevel/${groupId}`);
        }

        // if gameEnded is true, redirects all players to Game Over page
        if (data.gameEnded) {
          navigate(`/game-over/${groupId}`);
        }
      }
    });
    return () => unsubscribe();
  }, [groupId, navigate]);

  // ensures canvas updates when maze or position changes
  useEffect(() => {
    if (!mazeData || !mazeData.grid || !mazeData.size || !mazeData.cellSize) return;

    const { grid, size, cellSize } = mazeData;
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = size * cellSize;
    canvas.height = size * cellSize;

    const ctx = canvas.getContext("2d");
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "gray";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // draws maze walls
    grid.forEach((cell) => {
      const { row, col, walls } = cell;
      const x = col * cellSize;
      const y = row * cellSize;
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;

      if (walls.top) ctx.stroke(new Path2D(`M${x} ${y} L${x + cellSize} ${y}`));
      if (walls.right) ctx.stroke(new Path2D(`M${x + cellSize} ${y} L${x + cellSize} ${y + cellSize}`));
      if (walls.bottom) ctx.stroke(new Path2D(`M${x} ${y + cellSize} L${x + cellSize} ${y + cellSize}`));
      if (walls.left) ctx.stroke(new Path2D(`M${x} ${y} L${x} ${y + cellSize}`));
    });

    // draws exit - cheese
    const exitX = (size - 1) * cellSize;
    const exitY = (size - 1) * cellSize;
    const exitImage = new Image();
    exitImage.src = "/cheese2.png";
    
    exitImage.onload = () => {
      ctx.drawImage(exitImage,
        exitX,
        exitY,
        cellSize,
        cellSize);
      };

    // draws group character - mouse
    const playerX = groupPosition.col * cellSize + cellSize / 2;
    const playerY = groupPosition.row * cellSize + cellSize / 2;

    const playerImage = new Image();
    const scaleFactor = 1.2;
    playerImage.src = "/mouse.gif";
    
    playerImage.onload = () => {
      ctx.drawImage(
        playerImage,
        playerX - (cellSize * scaleFactor) / 2,
        playerY - (cellSize * scaleFactor), 
        cellSize * scaleFactor, 
        cellSize * scaleFactor);
    };
    
  }, [mazeData, groupPosition]);

  // moves the group character if it's the player's turn
  const movePlayer = async (direction) => {
    const { row, col } = groupPosition;
    const currentCell = mazeData.grid.find((cell) => cell.row === row && cell.col === col);

    let newRow = row;
    let newCol = col;

    if (direction === "up" && !currentCell.walls.top) newRow--;
    if (direction === "down" && !currentCell.walls.bottom) newRow++;
    if (direction === "left" && !currentCell.walls.left) {
      newCol--;
      setFacingDirection("left");
    } 
    if (direction === "right" && !currentCell.walls.right) {
      newCol++;
      setFacingDirection("right");
    }

    if (newRow !== row || newCol !== col) {
      const group = doc(db, "groups", groupId);

      await runTransaction(db, async (transaction) => {
        const groupDoc = await transaction.get(group);
        if (!groupDoc.exists()) return;
  
        const currentSteps = groupDoc.data().stepsTaken || 0;
  
        transaction.update(group, {
          position: { row: newRow, col: newCol },
          stepsTaken: currentSteps + 1,
        });
      });
      
      // checks if the team has reached the exit
      if (newRow === mazeData.size - 1 && newCol === mazeData.size - 1) {
        await updateDoc(group, { gameEnded: true });
        return;
      }

      passTurn();
    }
  };

  // function to passes turn to next player in group
  const passTurn = async () => {
    if (!groupData) return;

    const players = collection(db, "players");
    const playersSnapshot = await getDocs(players);
    
    // maps player IDs to their usernames
    const playerMap = {};
    playersSnapshot.forEach(doc => {
      playerMap[doc.id] = doc.data().username;
    });
  
    // converts groupData.players (IDs) to usernames
    const playerUsernames = groupData.players.map(id => playerMap[id]);
  
    console.log("Player List:", playerUsernames);
    console.log("Current Turn:", groupData.currentTurn);
  
    const currentPlayerIndex = playerUsernames.indexOf(groupData.currentTurn);
    
    if (currentPlayerIndex === -1) {
      console.error("ERROR: Current player not found in the list!");
      return;
    }
  
    const nextPlayerIndex = (currentPlayerIndex + 1) % playerUsernames.length;
    const nextPlayerUsername = playerUsernames[nextPlayerIndex];
  
    console.log("Next Turn:", nextPlayerUsername);
  
    const group = doc(db, "groups", groupId);
    await updateDoc(group, { currentTurn: nextPlayerUsername });
  };

  const quitGame = async () => {
    if (!groupId) return;
  
    const group = doc(db, "groups", groupId);
    const maze = doc(db, "mazes", groupId);

    try {
      await runTransaction(db, async (transaction) => {
        const groupDoc = await transaction.get(group);
  
        if (!groupDoc.exists()) return;
  
        // resets game state
        transaction.update(group, {
          gameStarted: false, 
          difficulty: null,
          stepsTaken: 0,
          position: { row: 0, col: 0 }
        });

        // resets the maze so a new one is generated next time
        transaction.delete(maze);
      });
  
      // redirects the current player immediately
      navigate(`/difficultyLevel/${groupId}`);
    }
    
    catch (error) {
      console.error("Error quitting the game:", error);
    }
  };
  
  
  useEffect(() => {
    console.log("Current Turn:", groupData?.currentTurn);
    console.log("Player Username:", player?.username);
  }, [groupData, player]);
  

  return (
    <div className="game-container">
      <button className="quit-game" onClick={quitGame}>Quit Game</button>

      <div className="game-info">
        <h2>Hello {player?.username}</h2>
        <h3>{groupData?.currentTurn === player?.username ? "It's your turn! Make a move!" : `Waiting for ${groupData?.currentTurn}⏳`}</h3>
        <p>Difficulty: <strong>{difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</strong></p>
        <p>Work together to guide the mouse to the cheese!</p>
        <p>Steps Taken: <strong>{steps}</strong></p>
      </div>

      <canvas ref={canvasRef} style={{ display: "block", margin: "auto", backgroundColor: "black" }} />

      <div className="controls" style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "20px" }}>
        <button 
          onClick={() => movePlayer("up")} 
          disabled={!(groupData?.currentTurn === player?.username)} >▲</button>

        <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
          <button 
            onClick={() => movePlayer("left")}
            disabled={!(groupData?.currentTurn === player?.username)}>◀</button>

          <button
            onClick={() => movePlayer("right")}
            disabled={!(groupData?.currentTurn === player?.username)}>▶</button>
        </div>

        <button 
          onClick={() => movePlayer("down")} 
          disabled={!(groupData?.currentTurn === player?.username)} >▼</button>
      </div>
      <Chatroom />
    </div>
  );
};

export default Game;