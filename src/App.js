import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import UsernameInput from "./components/usernameInput";
import WaitingRoom from "./components/waitingRoom";
import DifficultyLevel from "./components/difficultyLevel";
import Game from "./components/game";
import GameOver from "./components/gameOver";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<UsernameInput />} />
        <Route path="/waiting/:playerId" element={<WaitingRoom />} />
        <Route path="/difficultyLevel/:groupId" element={<DifficultyLevel />} />
        <Route path="/game/:groupId/:difficulty" element={<Game />} />
        <Route path="/game-over/:groupId" element={<GameOver />} />
      </Routes>
    </Router>
  );
};

export default App;