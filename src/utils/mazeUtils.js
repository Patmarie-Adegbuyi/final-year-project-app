import { db, doc, setDoc } from "../firebase";

export const generateMaze = async (difficulty, groupId) => {
    const maze = doc(db, "mazes", groupId);
  
    // defines maze size based on difficulty levels
    let size = difficulty === "easy" ? 10 : difficulty === "medium" ? 15 : 20;
    const cellSize = 30;
    let grid = [];
  
    // Create initial grid
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        grid.push({
          row: r,
          col: c,
          walls: { top: true, right: true, bottom: true, left: true }
        });
      }
    }
  
    // applies depth-first search to generate maze
    let stack = [];
    let current = grid[0];
    current.visited = true;
    stack.push(current);
  
    while (stack.length > 0) {
      let next = getUnvisitedNeighbor(current, grid, size);
      if (next) {
        next.visited = true;
        stack.push(current);
        removeWalls(current, next);
        current = next;
      }
      else {
        current = stack.pop();
      }
    }
    grid.forEach(cell => delete cell.visited);
  
    // saves maze to Firestore
    const mazeData = { grid, size, cellSize, mazeGenerated: true };
    await setDoc(maze, mazeData);
    console.log(`New maze generated for group ${groupId}:`, mazeData);
  
    return mazeData;
};  

// helper function to get unvisited neighbors for DFS
const getUnvisitedNeighbor = (cell, grid, size) => {
  let neighbors = [];
  const { row, col } = cell;

  let top = grid.find(c => c.row === row - 1 && c.col === col);
  let right = grid.find(c => c.row === row && c.col === col + 1);
  let bottom = grid.find(c => c.row === row + 1 && c.col === col);
  let left = grid.find(c => c.row === row && c.col === col - 1);

  if (top && !top.visited) neighbors.push(top);
  if (right && !right.visited) neighbors.push(right);
  if (bottom && !bottom.visited) neighbors.push(bottom);
  if (left && !left.visited) neighbors.push(left);

  return neighbors.length > 0 ? neighbors[Math.floor(Math.random() * neighbors.length)] : undefined;
};

// helper function to remove walls between adjacent cells
const removeWalls = (cell, neighbor) => {
  const dx = cell.col - neighbor.col;
  const dy = cell.row - neighbor.row;
  if (dx === 1) {
    cell.walls.left = false;
    neighbor.walls.right = false;
  } else if (dx === -1) {
    cell.walls.right = false;
    neighbor.walls.left = false;
  }
  if (dy === 1) {
    cell.walls.top = false;
    neighbor.walls.bottom = false;
  } else if (dy === -1) {
    cell.walls.bottom = false;
    neighbor.walls.top = false;
  }
};