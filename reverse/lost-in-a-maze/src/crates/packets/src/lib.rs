use game::{
    Snapshot,
    directions::Direction,
    maze::{Cell as GameCell, Size},
    positions::Position as GamePosition,
};
use rkyv::{Archive, Deserialize, Serialize};
use server::{
    Cell, GameSnapshot as PacketGameSnapshot, PlayerMoveResult as PacketPlayerMoveResult,
};

pub mod client;
pub mod server;

#[derive(Debug, Archive, Serialize, Deserialize, Clone, Copy)]
pub struct MazeSize {
    pub width: u32,
    pub height: u32,
}

pub const AVAILABLE_MAZE_SIZES: [MazeSize; 3] = [
    MazeSize {
        width: 25,
        height: 10,
    },
    MazeSize {
        width: 35,
        height: 15,
    },
    MazeSize {
        width: 45,
        height: 20,
    },
];

#[derive(Debug, Archive, Serialize, Deserialize, Clone, Copy, PartialEq, Eq)]
pub struct Position {
    pub x: u32,
    pub y: u32,
}

#[derive(Debug, Archive, Serialize, Deserialize, Clone, Copy, PartialEq, Eq)]
pub enum PlayerMoveDirection {
    Up,
    Down,
    Left,
    Right,
}

impl From<PlayerMoveDirection> for Direction {
    fn from(direction: PlayerMoveDirection) -> Self {
        match direction {
            PlayerMoveDirection::Up => Direction::Up,
            PlayerMoveDirection::Down => Direction::Down,
            PlayerMoveDirection::Left => Direction::Left,
            PlayerMoveDirection::Right => Direction::Right,
        }
    }
}

impl From<Size> for MazeSize {
    fn from(size: Size) -> Self {
        MazeSize {
            width: size.width as u32,
            height: size.height as u32,
        }
    }
}

impl From<GamePosition> for Position {
    fn from(position: GamePosition) -> Self {
        Position {
            x: position.x as u32,
            y: position.y as u32,
        }
    }
}

impl From<GameCell> for Cell {
    fn from(cell: GameCell) -> Self {
        match cell {
            GameCell::Wall => Cell::Wall,
            GameCell::Path => Cell::Path,
        }
    }
}

impl From<Snapshot<'_>> for PacketGameSnapshot {
    fn from(snapshot: Snapshot<'_>) -> Self {
        let mut cells = Vec::with_capacity(snapshot.maze.size.width * snapshot.maze.size.height);

        for y in 0..snapshot.maze.size.height {
            for x in 0..snapshot.maze.size.width {
                let cell = snapshot.maze.cell(&GamePosition { x, y });
                cells.push(cell.into());
            }
        }

        PacketGameSnapshot {
            size: snapshot.maze.size.into(),
            player: (*snapshot.player).into(),
            goal: (*snapshot.goal).into(),
            cells,
        }
    }
}

impl From<GamePosition> for PacketPlayerMoveResult {
    fn from(position: GamePosition) -> Self {
        PacketPlayerMoveResult {
            player: position.into(),
        }
    }
}
