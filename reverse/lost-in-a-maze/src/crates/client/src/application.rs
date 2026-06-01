use crate::{
    actions::Action,
    components::{Component, game::Game, home::Home, selection::Selection},
    events::Event,
    game,
    game::client::GameClient,
};
use packets::MazeSize;
use ratatui::{Frame, widgets::Block};

enum Screen {
    Home(Home),
    Selection(Selection),
    Game(Game),
}

pub struct Application {
    screen: Screen,
}

impl Application {
    pub fn new() -> Self {
        Self {
            screen: Screen::Home(Home::default()),
        }
    }

    pub fn handle_event(&mut self, event: Option<Event>) -> Action {
        match self.screen {
            Screen::Home(ref mut home) => home.handle_events(event),
            Screen::Selection(ref mut selection) => selection.handle_events(event),
            Screen::Game(ref mut game) => game.handle_events(event),
        }
    }

    pub fn apply_action(&mut self, action: Action) -> bool {
        match &action {
            Action::Quit => return false,
            Action::BackToHome | Action::Victory => {
                self.screen = Screen::Home(Home::default());
            }
            Action::SelectGameMode(mode) => {
                match game::build_client(*mode) {
                    Ok(client) => {
                        self.screen = Screen::Selection(Selection::with_client(client));
                    }
                    Err(e) => {
                        self.screen =
                            Screen::Selection(Selection::with_error(e.to_string()));
                    }
                }
            }
            Action::StartGame(size) => {
                match self.acquire_client() {
                    Ok(mut client) => {
                        let packet_size = MazeSize {
                            width: size.width as u32,
                            height: size.height as u32,
                        };
                        match client.start_game(packet_size) {
                            Ok(_) => {
                                let mut game = Game::default();
                                game.set_client(client);
                                self.screen = Screen::Game(game);
                            }
                            Err(error) => {
                                self.screen = Screen::Selection(Selection::with_error(
                                    error.to_string(),
                                ));
                            }
                        }
                    }
                    Err(error) => {
                        self.screen =
                            Screen::Selection(Selection::with_error(error.to_string()));
                    }
                }
            }
            Action::Noop => {}
        }

        match &mut self.screen {
            Screen::Home(home) => {
                home.update(&action);
            }
            Screen::Selection(selection) => {
                selection.update(&action);
            }
            Screen::Game(game) => {
                game.update(&action);
            }
        }

        true
    }

    fn acquire_client(&mut self) -> Result<Box<dyn GameClient>, color_eyre::eyre::Error> {
        if let Screen::Selection(selection) = &mut self.screen {
            if let Some(client) = selection.take_client() {
                return Ok(client);
            }
        }
        Err(color_eyre::eyre::eyre!("no client available"))
    }

    pub fn render(&mut self, frame: &mut Frame) {
        let area = frame.area();
        let background = Block::default();
        frame.render_widget(background, area);

        match self.screen {
            Screen::Home(ref mut home) => home.render(frame, area),
            Screen::Selection(ref mut selection) => selection.render(frame, area),
            Screen::Game(ref mut game) => game.render(frame, area),
        }
    }
}
