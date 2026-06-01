use crate::{
    directions::Direction,
    maze::{Cell, Maze},
    positions::Position,
};

pub mod directions;
pub mod maze;
pub mod positions;

pub struct Snapshot<'a> {
    pub maze: &'a Maze,
    pub player: &'a Position,
    pub goal: &'a Position,
}

#[derive(Debug)]
pub struct Game {
    maze: Maze,
    player: Position,
    goal: Position,
}

impl Game {
    pub fn new(width: usize, height: usize) -> Self {
        let maze = Maze::new(width.max(2), height.max(2));
        let player = maze.random_position();
        let mut goal = maze.random_position();

        while goal == player {
            goal = maze.random_position();
        }

        Self { maze, player, goal }
    }

    pub fn move_player(&mut self, direction: Direction) -> Position {
        let position = match direction {
            Direction::Up => Position {
                x: self.player.x,
                y: self.player.y.saturating_sub(1),
            },
            Direction::Down => Position {
                x: self.player.x,
                y: self.player.y.saturating_add(1),
            },
            Direction::Left => Position {
                x: self.player.x.saturating_sub(1),
                y: self.player.y,
            },
            Direction::Right => Position {
                x: self.player.x.saturating_add(1),
                y: self.player.y,
            },
        };

        if position.x < self.maze.size.width
            && position.y < self.maze.size.height
            && matches!(self.maze.cell(&position), Cell::Path)
        {
            self.player = position;
        }

        self.player
    }

    pub fn snapshot(&'_ self) -> Snapshot<'_> {
        Snapshot {
            maze: &self.maze,
            player: &self.player,
            goal: &self.goal,
        }
    }

    pub fn victory(&self) -> bool {
        self.player == self.goal
    }
}
