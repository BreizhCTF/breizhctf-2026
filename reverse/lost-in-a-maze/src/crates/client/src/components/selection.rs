use crate::{
    MazeSize,
    actions::Action,
    components::{
        Component,
        banner::{self, Banner},
        footer::Footer,
    },
    components::layout::center_horizontally,
    game::GameMode,
    game::client::GameClient,
    theme::ACCENT,
};
use game::maze::Size;
use ratatui::{Frame, crossterm::event::KeyCode, prelude::*, widgets::Paragraph};

#[derive(Default)]
pub struct Selection {
    pub offline_index: usize,
    pub selected_mode_index: usize,
    pub error: Option<String>,
    client: Option<Box<dyn GameClient>>,
    cached_sizes: Option<Vec<MazeSize>>,
}

impl Component for Selection {
    fn handle_key_events(&mut self, key: ratatui::crossterm::event::KeyEvent) -> Action {
        match key.code {
            KeyCode::Char('q') | KeyCode::Esc => Action::Quit,
            KeyCode::Backspace => Action::BackToHome,
            _ if self.error.is_some() => Action::Noop,
            KeyCode::Left | KeyCode::Up => {
                let len = self.available_sizes().unwrap_or_default().len();
                if len == 0 {
                    return Action::Noop;
                }
                self.offline_index = (self.offline_index + len - 1) % len;
                Action::Noop
            }
            KeyCode::Right | KeyCode::Down => {
                let len = self.available_sizes().unwrap_or_default().len();
                if len == 0 {
                    return Action::Noop;
                }
                self.offline_index = (self.offline_index + 1) % len;
                Action::Noop
            }
            KeyCode::Enter => {
                if self.error.is_some() {
                    return Action::Noop;
                }
                let sizes = match self.available_sizes() {
                    Ok(s) => s,
                    Err(e) => {
                        self.error = Some(e);
                        return Action::Noop;
                    }
                };
                if sizes.is_empty() {
                    return Action::Noop;
                }
                let MazeSize { width, height } =
                    sizes.get(self.offline_index).copied().unwrap_or(MazeSize {
                        width: 10,
                        height: 10,
                    });
                Action::StartGame(Size {
                    width: width as usize,
                    height: height as usize,
                })
            }
            _ => Action::Noop,
        }
    }

    fn update(&mut self, action: &Action) -> Action {
        if let Action::SelectGameMode(mode) = action {
            self.selected_mode_index = mode.as_index();
            self.offline_index = 0;
            self.error = None;
            self.cached_sizes = None;
        }

        Action::Noop
    }

    fn render(&mut self, frame: &mut Frame, area: Rect) {
        let banner_height = banner::BANNER.len() as u16;
        let list_height = self.available_sizes().unwrap_or_default().len().max(1) as u16 + 3;
        let footer_height = 2;
        let total_height = banner_height + list_height + footer_height + 2;
        let center = center_horizontally(72, total_height, area);
        let layers = Layout::vertical([
            Constraint::Length(banner_height),
            Constraint::Length(1),
            Constraint::Length(list_height),
            Constraint::Length(1),
            Constraint::Length(footer_height),
        ])
        .split(center);

        Banner::default().render(frame, layers[0]);

        let mut size_lines: Vec<Line> = vec![
            Line::from(vec![Span::styled(
                "Select map size",
                Style::default().add_modifier(Modifier::BOLD),
            )]),
            Line::raw(""),
        ];
        let sizes = match self.available_sizes() {
            Ok(s) => s,
            Err(e) => {
                self.error = Some(e);
                Vec::new()
            }
        };

        for (i, size) in sizes.iter().enumerate() {
            let text = format!("{:>2}x{:>2}", size.width, size.height);
            let selected = i == self.offline_index;
            size_lines.push(Line::from(vec![Span::styled(
                text,
                Style::default()
                    .fg(if selected { ACCENT } else { Color::White })
                    .add_modifier(if selected {
                        Modifier::BOLD
                    } else {
                        Modifier::empty()
                    }),
            )]));
        }

        let size_block = Paragraph::new(size_lines)
            .alignment(Alignment::Center)
            .wrap(ratatui::widgets::Wrap { trim: true });
        frame.render_widget(size_block, layers[2]);

        let footer_lines = if let Some(msg) = &self.error {
            vec![Line::from(Span::styled(
                msg.clone(),
                Style::default().fg(Color::Red),
            ))]
        } else {
            vec![
                Line::from(vec![
                    Span::styled("Mode: ", Style::default().fg(Color::Gray)),
                    Span::styled(
                        GameMode::from_index(self.selected_mode_index)
                            .label()
                            .to_string(),
                        Style::default().fg(ACCENT),
                    ),
                ]),
                Line::from(vec![Span::styled(
                    "Use arrows, Enter to start, Backspace to home",
                    Style::default().fg(Color::Gray),
                )]),
            ]
        };
        Footer {
            lines: footer_lines,
        }
        .render(frame, layers[4]);
    }
}

impl Selection {
    pub fn with_error(message: String) -> Self {
        Self {
            error: Some(message),
            ..Default::default()
        }
    }

    pub fn with_client(client: Box<dyn GameClient>) -> Self {
        Self {
            client: Some(client),
            ..Default::default()
        }
    }

    fn available_sizes(&mut self) -> Result<Vec<MazeSize>, String> {
        if let Some(cached) = &self.cached_sizes {
            return Ok(cached.clone());
        }
        if self.error.is_some() {
            return Ok(Vec::new());
        }
        let client = self
            .client
            .as_mut()
            .ok_or_else(|| "No game client available".to_string())?;
        let sizes = client.available_maze_sizes().map_err(|e| e.to_string())?;
        self.cached_sizes = Some(sizes.clone());
        Ok(sizes)
    }

    pub fn take_client(&mut self) -> Option<Box<dyn GameClient>> {
        self.client.take()
    }
}
