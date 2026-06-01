use crate::{
    actions::Action,
    components::{
        Component,
        banner::{self, Banner},
        footer::Footer,
    },
    components::layout::center_horizontally,
    game::GameMode,
    theme::ACCENT,
};
use ratatui::{
    Frame,
    crossterm::event::KeyCode,
    layout::{Alignment, Constraint, Layout, Rect},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::Paragraph,
};

#[derive(Default)]
pub struct Home {
    pub primary_index: usize,
}

impl Component for Home {
    fn handle_key_events(&mut self, key: ratatui::crossterm::event::KeyEvent) -> Action {
        match key.code {
            KeyCode::Char('q') | KeyCode::Esc => Action::Quit,
            KeyCode::Left | KeyCode::Up => {
                self.primary_index =
                    (self.primary_index + GameMode::ALL.len() - 1) % GameMode::ALL.len();

                Action::Noop
            }
            KeyCode::Right | KeyCode::Down => {
                self.primary_index = (self.primary_index + 1) % GameMode::ALL.len();

                Action::Noop
            }
            KeyCode::Enter => {
                let mode = GameMode::from_index(self.primary_index);
                Action::SelectGameMode(mode)
            }
            _ => Action::Noop,
        }
    }

    fn render(&mut self, frame: &mut Frame, area: Rect) {
        let footer_lines = vec![
            Line::from("Arrows to move • Enter to confirm"),
            Line::from("Backspace to return • q / Esc to quit"),
        ];

        let sections = [
            banner::BANNER.len() as u16,
            1,
            GameMode::ALL.len() as u16,
            1,
            footer_lines.len() as u16,
        ];

        let total_height: u16 = sections.iter().sum();
        let center = center_horizontally(80, total_height, area);
        let layers = Layout::vertical(sections.map(Constraint::Length)).split(center);

        let mut banner = Banner::default();
        banner.render(frame, layers[0]);

        let mut mode_lines = Vec::new();
        let mode_width = GameMode::ALL
            .iter()
            .map(|m| m.label().len())
            .max()
            .unwrap_or(0)
            + 6;
        mode_lines.extend(GameMode::ALL.iter().enumerate().map(|(i, mode)| {
            let label = mode.label();
            let selected = i == self.primary_index;
            let mut style = Style::default().fg(Color::Gray);
            if selected {
                style = Style::default().fg(ACCENT).add_modifier(Modifier::BOLD);
            }
            Line::from(Span::styled(
                format!("{:^width$}", label, width = mode_width),
                style,
            ))
        }));
        let modes = Paragraph::new(mode_lines)
            .alignment(Alignment::Center)
            .wrap(ratatui::widgets::Wrap { trim: false });
        frame.render_widget(modes, layers[2]);

        let mut footer = Footer { lines: footer_lines };
        footer.render(frame, layers[4]);
    }
}
