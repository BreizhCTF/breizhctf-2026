use crate::{components::Component, theme::ACCENT};
use ratatui::{
    Frame,
    layout::{Alignment, Rect},
    style::Style,
    widgets::{Paragraph, Wrap},
};

pub const BANNER: [&str; 2] = ["Lost in Maze", "Ascend the shifting labyrinth"];

#[derive(Debug, Default)]
pub struct Banner;

impl Component for Banner {
    fn render(&mut self, frame: &mut Frame, area: Rect) {
        let art = BANNER.join("\n");
        let title = Paragraph::new(art)
            .alignment(Alignment::Center)
            .wrap(Wrap { trim: false })
            .style(Style::default().fg(ACCENT));
        frame.render_widget(title, area);
    }
}
