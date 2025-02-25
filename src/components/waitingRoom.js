import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { 
  doc, getDoc, onSnapshot, updateDoc, deleteDoc, collection, 
  getDocs, runTransaction, query, where
} from "firebase/firestore";
import Chatroom from "./chatroom";
import "../assets/styles/waitingRoom.css";

const WaitingPage = () => {
  const { playerId } = useParams();
  const navigate = useNavigate();
  const [player, setPlayer] = useState(null);
  const [playersInGroup, setPlayersInGroup] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groupId, setGroupId] = useState(null);

  useEffect(() => {
    if (!playerId) return;
  
    const player = doc(db, "players", playerId);
  
    const unsubscribe = onSnapshot(player, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        setPlayer(data);
        setGroupId(data.group);
        sessionStorage.setItem("groupId", data.group);
        setLoading(false);

        if (data.username) {
          sessionStorage.setItem("username", data.username);
        }
  
        if (data.group) {
          watchGroup(data.group);
          monitorGameStart(data.group);
        } else {
          assignToGroup(playerId);
        }
      } else {
        setLoading(false);
      }
    });
  
    return () => unsubscribe();
  }, [playerId]); 

  // monitors game start status in the group
  const monitorGameStart = (groupId) => {
    const group = doc(db, "groups", groupId);
    const unsubscribe = onSnapshot(group, (docSnapshot) => {
      if (docSnapshot.exists() && docSnapshot.data().gameStarted) {
        navigate(`/difficultyLevel/${groupId}`);
      }
    });

    return () => unsubscribe();
  };

  // assigns players to groups of 3
  const assignToGroup = async (playerId) => {
    try {
      await runTransaction(db, async (transaction) => {
        const players = collection(db, "players");
        const groups = collection(db, "groups");
  
        const playersSnapshot = await getDocs(players);
        const groupsSnapshot = await getDocs(groups);
  
        let waitingPlayers = [];
        let openGroup = null;
        let openGroupPlayers = [];
  
        // looks for players who are waiting to be put into a group
        playersSnapshot.forEach((doc) => {
          const playerData = doc.data();
          if (playerData.status === "waiting" && !playerData.group) {
            waitingPlayers.push(doc.id);
          }
        });
  
        // looks for an existing group with less than 3 players
        groupsSnapshot.forEach((doc) => {
          const groupData = doc.data();
          if (!groupData.gameStarted && groupData.players.length < 3) {
            openGroup = doc.id;
            openGroupPlayers = groupData.players;
          }
        });

        if (openGroup) {
          // adds player to an existing open group
          const player = doc(db, "players", playerId);
          transaction.update(player, {
            group: openGroup,
            status: "assigned",
          });

          const group = doc(db, "groups", openGroup);
          transaction.update(group, {
            players: [...openGroupPlayers, playerId],
          });
        }
        else if (waitingPlayers.length >= 3) {
          // creates a new group if there are 3 waiting players
          const newGroupId = `group_${Date.now()}`;
          const newGroup = doc(db, "groups", newGroupId);

          const newGroupPlayers = waitingPlayers.slice(0, 3);

          transaction.set(newGroup, {
            gameStarted: false,
            players: newGroupPlayers,
          });

          for (let i = 0; i < 3; i++) {
            const player = doc(db, "players", waitingPlayers[i]);
            transaction.update(player, {
              group: newGroupId,
              status: "assigned",
            });
          }
        }
      });
    }
    catch (error) {
      console.error("Error assigning players to a group:", error);
    }
  };

  // watchs group members in real-time
  const watchGroup = (groupId) => {
    const playersQuery = query(collection(db, "players"), where("group", "==", groupId));
    const unsubscribe = onSnapshot(playersQuery, (querySnapshot) => {
        setPlayersInGroup(querySnapshot.docs.map(doc => doc.data()));
    });
    return () => unsubscribe();
  };

  // handles a player leaving the game after being assigned to a group
  const handleLeave = async () => {
    try {
      const player = doc(db, "players", playerId);
      const playerSnapshot = await getDoc(player);
  
      if (!playerSnapshot.exists()) return;
  
      const playerData = playerSnapshot.data();
      const playerGroup = playerData.group;
  
      if (playerGroup) {
        const group = doc(db, "groups", playerGroup);
        const groupSnapshot = await getDoc(group);
  
        if (groupSnapshot.exists()) {
          const groupData = groupSnapshot.data();
          const updatedPlayers = groupData.players.filter(id => id !== playerId);
  
          if (updatedPlayers.length === 0) {
            await deleteDoc(group);
          }
          else {
            await updateDoc(group, { players: updatedPlayers });
          }
        }
      }
  
      await deleteDoc(player);
      navigate("/");
    }
    catch (error) {
      console.error("Error leaving the game:", error);
    }
  };

  // if one person in group presses "Start Game" button, all members of group are redirected to game page
  const handleStartGame = async () => {
    if (groupId && playersInGroup.length > 0) {
      const firstPlayer = playersInGroup[0];
      const group = doc(db, "groups", groupId);
      await updateDoc(group, { 
        gameStarted: true, 
        currentTurn: firstPlayer.username
      });
    }
  };  

  if (loading) {
    return (
      <div>
        <p>Loading... Please wait.</p>
      </div>
    );
  }

  return (
    <div className="background">
      <div className="waiting-container">
        {groupId ? (
        <div className="group-list">
          <h2>Your Team</h2>
          <ul className="players-list">
            {playersInGroup.map((player) => (
              <li key={player.username}>{player.username}</li>
            ))}
          </ul>
          {playersInGroup.length >= 3 && (
            <button className="start-button" onClick={handleStartGame}>Start Game</button>
          )}
          {groupId && <Chatroom />}
        </div>
        ) : (
          <div className="waiting">
            <h2>Waiting for Group Assignment</h2>
            <p>Your Name: {player?.username}</p>
            <p>Waiting to be assigned to a group...</p>
          </div>
        )}
      <button className="leave-button" onClick={handleLeave}>Leave</button>
      </div>
    </div> 
  );
};

export default WaitingPage;