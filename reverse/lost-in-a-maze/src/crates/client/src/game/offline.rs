use crate::game::client::{GameClient, MoveOutcome};
use color_eyre::eyre::{Result, eyre};
use game::{Game, directions::Direction};
use packets::{
    MazeSize, PlayerMoveDirection, Position, AVAILABLE_MAZE_SIZES,
    server::{Cell, GameSnapshot},
};

#[derive(Debug)]
pub struct OfflineGameClient {
    game: Option<Game>,
    snapshot: Option<GameSnapshot>,
}

impl OfflineGameClient {
    pub fn new() -> Self {
        Self {
            game: None,
            snapshot: None,
        }
    }
}

impl GameClient for OfflineGameClient {
    fn available_maze_sizes(&mut self) -> Result<Vec<MazeSize>> {
        Ok(AVAILABLE_MAZE_SIZES.to_vec())
    }

    fn start_game(&mut self, size: MazeSize) -> Result<GameSnapshot> {
        self.game = Some(Game::new(size.width as usize, size.height as usize));
        let snap = build_snapshot(self.game.as_ref().unwrap());
        self.snapshot = Some(snap.clone());
        Ok(snap)
    }

    fn snapshot(&self) -> Option<GameSnapshot> {
        self.snapshot.clone()
    }

    fn move_player(&mut self, direction: PlayerMoveDirection) -> Result<MoveOutcome> {
        let game = self
            .game
            .as_mut()
            .ok_or_else(|| eyre!("game not started"))?;
        let dir = match direction {
            PlayerMoveDirection::Up => Direction::Up,
            PlayerMoveDirection::Down => Direction::Down,
            PlayerMoveDirection::Left => Direction::Left,
            PlayerMoveDirection::Right => Direction::Right,
        };
        game.move_player(dir);
        let snap = build_snapshot(game);
        self.snapshot = Some(snap.clone());
        if game.victory() {
            Ok(MoveOutcome::Victory("You escaped the maze!".into()))
        } else {
            Ok(MoveOutcome::Moved)
        }
    }
}

fn build_snapshot(game: &Game) -> GameSnapshot {
    let snap = game.snapshot();
    let size = MazeSize {
        width: snap.maze.size.width as u32,
        height: snap.maze.size.height as u32,
    };
    let player = Position {
        x: snap.player.x as u32,
        y: snap.player.y as u32,
    };
    let goal = Position {
        x: snap.goal.x as u32,
        y: snap.goal.y as u32,
    };
    let mut cells = Vec::with_capacity(snap.maze.size.width * snap.maze.size.height);
    for y in 0..snap.maze.size.height {
        for x in 0..snap.maze.size.width {
            let cell = snap.maze.cell(&game::positions::Position { x, y });
            cells.push(match cell {
                game::maze::Cell::Wall => Cell::Wall,
                game::maze::Cell::Path => Cell::Path,
            });
        }
    }
    GameSnapshot {
        size,
        player,
        goal,
        cells,
    }
}
