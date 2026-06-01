use application::Application;
use color_eyre::eyre::Result;
use events::Event;
use packets::MazeSize;
use ratatui::{
    Terminal,
    backend::CrosstermBackend,
    crossterm,
    crossterm::{
        event::{
            self, DisableMouseCapture, EnableMouseCapture, Event as CrosstermEvent, KeyEventKind,
            read,
        },
        terminal::{self, EnterAlternateScreen, LeaveAlternateScreen},
    },
};
use std::{
    io::{self, Result as IoResult, Stdout},
    time::{Duration, Instant},
};

mod actions;
mod application;
mod components;
mod events;
mod game;
mod theme;

fn main() -> Result<()> {
    let mut terminal = setup_terminal()?;
    let result = run(&mut terminal);
    restore_terminal(&mut terminal)?;

    result
}

fn run(terminal: &mut Terminal<CrosstermBackend<Stdout>>) -> Result<()> {
    let mut application = Application::new();
    let tick_rate = Duration::from_millis(250);
    let last_tick = Instant::now();

    loop {
        terminal.draw(|frame| application.render(frame))?;

        let timeout = tick_rate.saturating_sub(last_tick.elapsed());

        if let Some(event) = next_event(timeout)? {
            let action = application.handle_event(Some(event));

            if !application.apply_action(action) {
                break;
            }
        }
    }

    Ok(())
}

fn next_event(timeout: Duration) -> Result<Option<Event>> {
    if event::poll(timeout)? {
        let event = read()?;

        if let CrosstermEvent::Key(key) = event
            && key.kind == KeyEventKind::Release
        {
            return Ok(None);
        }

        return match event {
            CrosstermEvent::Key(key) => Ok(Some(Event::Key(key))),
            _ => Ok(None),
        };
    }

    Ok(None)
}

fn setup_terminal() -> IoResult<Terminal<CrosstermBackend<Stdout>>> {
    terminal::enable_raw_mode()?;
    let mut stdout = io::stdout();
    crossterm::execute!(stdout, EnterAlternateScreen, EnableMouseCapture)?;

    Terminal::new(CrosstermBackend::new(stdout))
}

fn restore_terminal(terminal: &mut Terminal<CrosstermBackend<Stdout>>) -> IoResult<()> {
    terminal::disable_raw_mode()?;
    crossterm::execute!(
        terminal.backend_mut(),
        DisableMouseCapture,
        LeaveAlternateScreen
    )?;

    terminal.show_cursor()
}
