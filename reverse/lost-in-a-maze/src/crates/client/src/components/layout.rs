use ratatui::layout::{Constraint, Layout, Rect};

pub fn center_horizontally(width: u16, height: u16, area: Rect) -> Rect {
    let height = height.min(area.height);
    let width = width.min(area.width);

    let vertical = Layout::vertical([
        Constraint::Min(area.height.saturating_sub(height) / 2),
        Constraint::Length(height),
        Constraint::Min(area.height.saturating_sub(height) / 2),
    ])
    .split(area);

    let horizontal = Layout::horizontal([
        Constraint::Min(area.width.saturating_sub(width) / 2),
        Constraint::Length(width),
        Constraint::Min(area.width.saturating_sub(width) / 2),
    ])
    .split(vertical[1]);

    horizontal[1]
}
