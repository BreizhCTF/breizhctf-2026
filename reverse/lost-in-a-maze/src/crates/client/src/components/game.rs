use crate::{
    actions::Action,
    components::{
        Component,
        banner::{self, Banner},
    },
    components::layout::center_horizontally,
    game::client::{GameClient, MoveOutcome},
};
use packets::{Position, server::GameSnapshot};
use ratatui::{
    Frame,
    layout::{Alignment, Constraint, Layout, Rect},
    style::{Color, Style},
    text::{Line, Span},
    widgets::{Paragraph, Wrap},
};

const PLAYER_CHAR: char = '@';
const GOAL_CHAR: char = '*';

// connection logic lives in game_client

pub struct Client {
    backend: Option<Box<dyn GameClient>>,
    status: Option<String>,
    frozen: bool,
    is_error: bool,
}

impl Client {
    pub fn new() -> Self {
        Self {
            backend: None,
            status: None,
            frozen: false,
            is_error: false,
        }
    }

    pub fn set_client(&mut self, client: Box<dyn GameClient>) {
        self.backend = Some(client);
        self.status = None;
        self.is_error = false;
        self.frozen = false;
    }
}

impl Default for Client {
    fn default() -> Self {
        Self::new()
    }
}

pub type Game = Client;

impl Component for Client {
    fn handle_key_events(&mut self, key: ratatui::crossterm::event::KeyEvent) -> Action {
        use ratatui::crossterm::event::KeyCode;
        match key.code {
            KeyCode::Char('q') | KeyCode::Esc => Action::Quit,
            KeyCode::Enter => {
                if self.frozen {
                    return Action::Victory;
                }
                Action::Noop
            }
            _ if self.frozen => Action::Noop,
            KeyCode::Up | KeyCode::Down | KeyCode::Left | KeyCode::Right => {
                let direction = match key.code {
                    KeyCode::Up => packets::PlayerMoveDirection::Up,
                    KeyCode::Down => packets::PlayerMoveDirection::Down,
                    KeyCode::Left => packets::PlayerMoveDirection::Left,
                    KeyCode::Right => packets::PlayerMoveDirection::Right,
                    _ => unreachable!(),
                };
                if let Some(backend) = &mut self.backend {
                    match backend.move_player(direction) {
                        Ok(MoveOutcome::Victory(msg)) => {
                            self.status = Some(msg);
                            self.is_error = false;
                            self.frozen = true;
                        }
                        Ok(MoveOutcome::Moved) => {
                            self.status = None;
                            self.is_error = false;
                        }
                        Err(e) => {
                            self.status =
                                Some(format!("Network error: {e}. Press Enter to return."));
                            self.is_error = true;
                            self.frozen = true;
                        }
                    }
                }
                Action::Noop
            }
            _ => Action::Noop,
        }
    }

    fn update(&mut self, action: &Action) -> Action {
        if let Action::Victory = action {
            self.frozen = false;
            self.is_error = false;
        }
        Action::Noop
    }

    fn render(&mut self, frame: &mut Frame, area: Rect) {
        let banner_height = banner::BANNER.len() as u16;

        let Some(backend) = &mut self.backend else {
            let mut banner_widget = Banner::default();
            banner_widget.render(frame, area);
            return;
        };

        let snapshot: GameSnapshot = match backend.snapshot() {
            Some(s) => s,
            None => {
                let mut banner_widget = Banner::default();
                banner_widget.render(frame, area);
                return;
            }
        };
        let reached = snapshot.player == snapshot.goal;
        let open: Vec<bool> = snapshot
            .cells
            .iter()
            .map(|c| matches!(c, packets::server::Cell::Path))
            .collect();
        let maze_lines = render_maze_lines(
            &open,
            snapshot.size.width as usize,
            snapshot.size.height as usize,
            snapshot.player,
            snapshot.goal,
            PLAYER_CHAR,
            GOAL_CHAR,
            '█',
            if reached { usize::MAX } else { 2 },
        );
        let status_line = if self.is_error {
            "Network error. Press Enter to return to menu."
        } else {
            self.status.as_deref().unwrap_or_else(|| {
                if reached {
                    self.frozen = true;
                    "Goal found! Press Enter to return to menu."
                } else {
                    "Use arrows to move. Enter does nothing. q/Esc to leave."
                }
            })
        };

        let content_width = snapshot.size.width as u16;
        let footer_width = content_width.max(1) as usize;
        let footer_height = if self.is_error || self.status.is_some() {
            status_line.chars().count().max(1).div_ceil(footer_width) as u16
        } else {
            2
        };
        let content_height = (maze_lines.len() as u16).max(6);
        let total_height = banner_height + content_height + footer_height + 2;

        let center = center_horizontally(content_width, total_height, area);
        let layers = Layout::vertical([
            Constraint::Length(banner_height),
            Constraint::Length(1),
            Constraint::Length(content_height),
            Constraint::Length(1),
            Constraint::Length(footer_height),
        ])
        .split(center);

        let mut banner_widget = Banner::default();
        banner_widget.render(frame, layers[0]);

        let maze = Paragraph::new(maze_lines.join("\n"))
            .alignment(Alignment::Center)
            .wrap(ratatui::widgets::Wrap { trim: false })
            .style(Style::default().fg(Color::Gray));
        frame.render_widget(maze, layers[2]);

        let color = if self.is_error {
            Color::Red
        } else {
            Color::Gray
        };

        let footer = Paragraph::new(Line::from(Span::styled(
            status_line,
            Style::default().fg(color),
        )))
        .alignment(Alignment::Center)
        .wrap(Wrap { trim: true });
        frame.render_widget(footer, layers[4]);
    }
}

#[allow(clippy::too_many_arguments)]
fn render_maze_lines(
    open: &[bool],
    width: usize,
    height: usize,
    player: Position,
    goal: Position,
    player_char: char,
    goal_char: char,
    wall_char: char,
    vision_radius: usize,
) -> Vec<String> {
    let player_x = player.x as usize;
    let player_y = player.y as usize;
    let goal_x = goal.x as usize;
    let goal_y = goal.y as usize;
    let mut lines: Vec<String> = Vec::with_capacity(height);
    for y in 0..height {
        let mut line = String::with_capacity(width);
        for x in 0..width {
            let dist = player_x.abs_diff(x).max(player_y.abs_diff(y));
            let visible = dist <= vision_radius;
            let idx = y * width + x;
            let is_open = open.get(idx).copied().unwrap_or(false);
            let ch = if x == player_x && y == player_y {
                player_char
            } else if x == goal_x && y == goal_y {
                if visible { goal_char } else { '·' }
            } else if is_open {
                if visible { ' ' } else { '·' }
            } else if visible {
                wall_tile(open, width, height, x, y, wall_char)
            } else {
                '·'
            };
            line.push(ch);
        }
        lines.push(line);
    }

    lines
}

fn wall_tile(
    open: &[bool],
    width: usize,
    height: usize,
    x: usize,
    y: usize,
    fallback: char,
) -> char {
    let idx = y * width + x;
    if open.get(idx).copied().unwrap_or(true) {
        return ' ';
    }

    let is_wall = |nx: isize, ny: isize| -> bool {
        if nx < 0 || ny < 0 || nx >= width as isize || ny >= height as isize {
            return false;
        }
        let nidx = ny as usize * width + nx as usize;
        !open.get(nidx).copied().unwrap_or(true)
    };

    let north = is_wall(x as isize, y as isize - 1);
    let south = is_wall(x as isize, y as isize + 1);
    let west = is_wall(x as isize - 1, y as isize);
    let east = is_wall(x as isize + 1, y as isize);

    match (north, south, west, east) {
        (true, true, true, true) => '┼',
        (true, true, true, false) => '┤',
        (true, true, false, true) => '├',
        (true, false, true, true) => '┴',
        (false, true, true, true) => '┬',
        (true, true, false, false) => '│',
        (false, false, true, true) => '─',
        (true, false, true, false) => '┘',
        (true, false, false, true) => '└',
        (false, true, true, false) => '┐',
        (false, true, false, true) => '┌',
        (true, false, false, false) => '╵',
        (false, true, false, false) => '╷',
        (false, false, true, false) => '╴',
        (false, false, false, true) => '╶',
        _ => fallback,
    }
}
