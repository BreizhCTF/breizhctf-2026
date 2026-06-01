use crate::components::Component;
use ratatui::{
    Frame,
    layout::{Alignment, Rect},
    style::{Color, Style},
    text::Line,
    widgets::{Paragraph, Wrap},
};

#[derive(Debug, Default)]
pub struct Footer {
    pub lines: Vec<Line<'static>>,
}

impl Component for Footer {
    fn render(&mut self, frame: &mut Frame, area: Rect) {
        let footer = Paragraph::new(self.lines.clone())
            .alignment(Alignment::Center)
            .wrap(Wrap { trim: true })
            .style(Style::default().fg(Color::Gray));
        frame.render_widget(footer, area);
    }
}
