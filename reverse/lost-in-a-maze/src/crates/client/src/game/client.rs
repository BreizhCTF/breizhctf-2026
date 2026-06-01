use color_eyre::eyre::Result;
use packets::{MazeSize, PlayerMoveDirection, server::GameSnapshot};

#[derive(Debug)]
pub enum MoveOutcome {
    Moved,
    Victory(String),
}

pub trait GameClient {
    fn available_maze_sizes(&mut self) -> Result<Vec<MazeSize>>;
    fn start_game(&mut self, size: MazeSize) -> Result<GameSnapshot>;
    fn snapshot(&self) -> Option<GameSnapshot>;
    fn move_player(&mut self, direction: PlayerMoveDirection) -> Result<MoveOutcome>;
}
