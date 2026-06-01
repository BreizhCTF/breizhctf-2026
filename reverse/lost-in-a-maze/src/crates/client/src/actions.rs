use crate::game::GameMode;
use game::maze::Size;

#[derive(Debug, Clone)]
pub enum Action {
    Quit,
    BackToHome,
    SelectGameMode(GameMode),
    StartGame(Size),
    Victory,
    Noop,
}
