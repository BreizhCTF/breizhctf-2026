use crate::positions::Position;
use rand::{
    self,
    rngs::ThreadRng,
    seq::{IndexedRandom, SliceRandom},
};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Cell {
    Wall,
    Path,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Size {
    pub width: usize,
    pub height: usize,
}

#[derive(Clone, Debug)]
pub struct Maze {
    pub size: Size,
    map: Vec<Cell>,
}

impl Maze {
    pub fn new(width: usize, height: usize) -> Self {
        let width = width.max(3) | 1;
        let height = height.max(3) | 1;
        let size = Size { width, height };

        let mut maze = Self {
            size,
            map: vec![Cell::Wall; width * height],
        };
        maze.generate();

        maze
    }

    fn generate(&mut self) {
        let mut random_generator = rand::rng();
        let mut stack = Vec::with_capacity(self.size.width * self.size.height);

        let start = self.random_start_position(&mut random_generator);
        self.mark_as_path(&start);
        stack.push(start);

        while let Some(current_cell) = stack.pop() {
            let mut neighbors = self.neighbors(&current_cell);

            if neighbors.is_empty() {
                continue;
            }

            stack.push(current_cell);

            neighbors.shuffle(&mut random_generator);
            let next_cell = neighbors[0];

            self.carve_between(&current_cell, &next_cell);
            self.mark_as_path(&next_cell);

            stack.push(next_cell);
        }
    }

    fn neighbors(&self, position: &Position) -> Vec<Position> {
        let mut neighbors = Vec::new();

        let mut try_push = |position: Position| {
            if matches!(self.cell(&position), Cell::Wall) {
                neighbors.push(position);
            }
        };

        if position.x >= 2 {
            try_push(Position {
                x: position.x - 2,
                y: position.y,
            });
        }

        if position.x + 2 < self.size.width {
            try_push(Position {
                x: position.x + 2,
                y: position.y,
            });
        }

        if position.y >= 2 {
            try_push(Position {
                x: position.x,
                y: position.y - 2,
            });
        }

        if position.y + 2 < self.size.height {
            try_push(Position {
                x: position.x,
                y: position.y + 2,
            });
        }

        neighbors
    }

    fn carve_between(&mut self, first_cell: &Position, second_cell: &Position) {
        let middle_position = Position {
            x: (first_cell.x + second_cell.x) / 2,
            y: (first_cell.y + second_cell.y) / 2,
        };

        self.mark_as_path(&middle_position);
    }

    fn mark_as_path(&mut self, position: &Position) {
        let index = position.y * self.size.width + position.x;

        if let Some(cell) = self.map.get_mut(index) {
            *cell = Cell::Path;
        }
    }

    fn random_start_position(&self, random_generator: &mut ThreadRng) -> Position {
        let x_choices: Vec<usize> = (1..self.size.width).step_by(2).collect();
        let y_choices: Vec<usize> = (1..self.size.height).step_by(2).collect();
        let x = *x_choices.choose(random_generator).unwrap_or(&1);
        let y = *y_choices.choose(random_generator).unwrap_or(&1);

        Position { x, y }
    }

    fn index(&self, position: &Position) -> usize {
        position.y * self.size.width + position.x
    }

    pub fn random_position(&self) -> Position {
        let indices: Vec<_> = self
            .map
            .iter()
            .enumerate()
            .filter(|(_, cell)| matches!(cell, Cell::Path))
            .map(|(index, _)| index)
            .collect();

        let mut random_generator = rand::rng();
        let index = *indices
            .choose(&mut random_generator)
            .expect("maze must contain path cells");

        Position {
            x: index % self.size.width,
            y: index / self.size.width,
        }
    }

    pub fn cell(&self, position: &Position) -> Cell {
        self.map[self.index(position)]
    }
}
