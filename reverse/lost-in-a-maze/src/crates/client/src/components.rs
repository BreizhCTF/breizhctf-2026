use crate::{actions::Action, events::Event};
use ratatui::{Frame, crossterm::event::KeyEvent, layout::Rect};

pub mod banner;
pub mod footer;
pub mod game;
pub mod home;
pub mod layout;
pub mod selection;

pub trait Component {
    fn handle_events(&mut self, event: Option<Event>) -> Action {
        match event {
            Some(Event::Key(key_event)) => self.handle_key_events(key_event),
            None => Action::Noop,
        }
    }

    fn handle_key_events(&mut self, _key: KeyEvent) -> Action {
        Action::Noop
    }

    fn update(&mut self, _action: &Action) -> Action {
        Action::Noop
    }

    fn render(&mut self, frame: &mut Frame, area: Rect);
}
