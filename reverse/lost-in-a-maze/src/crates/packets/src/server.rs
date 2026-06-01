use crate::{MazeSize, Position};
use rkyv::{Archive, Deserialize, Serialize};

#[derive(Debug, Archive, Serialize, Deserialize)]
pub enum Packet {
    MazeSizesResponse(Vec<MazeSize>),
    SnapshotResponse(GameSnapshot),
    MoveResponse(PlayerMoveResult),
    VictoryResponse(String),
    ErrorResponse(String),
}

#[derive(Debug, Archive, Serialize, Deserialize, Clone)]
pub struct GameSnapshot {
    pub size: MazeSize,
    pub player: Position,
    pub goal: Position,
    pub cells: Vec<Cell>,
}

#[derive(Debug, Archive, Serialize, Deserialize, Clone, Copy, PartialEq, Eq)]
pub enum Cell {
    Wall,
    Path,
}

#[derive(Debug, Archive, Serialize, Deserialize, Clone)]
pub struct PlayerMoveResult {
    pub player: Position,
}
