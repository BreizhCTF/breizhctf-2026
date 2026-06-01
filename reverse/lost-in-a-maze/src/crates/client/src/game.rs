use client::GameClient;
use color_eyre::eyre::Result;
use offline::OfflineGameClient;
use online::OnlineGameClient;

pub mod client;
pub mod offline;
pub mod online;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GameMode {
    Online,
    Offline,
}

impl GameMode {
    pub const ALL: [GameMode; 2] = [GameMode::Offline, GameMode::Online];

    pub fn label(self) -> &'static str {
        match self {
            GameMode::Online => "Online",
            GameMode::Offline => "Offline",
        }
    }

    pub fn from_index(index: usize) -> GameMode {
        GameMode::ALL
            .get(index % GameMode::ALL.len())
            .copied()
            .unwrap_or(GameMode::Offline)
    }

    pub fn as_index(self) -> usize {
        match self {
            GameMode::Offline => 0,
            GameMode::Online => 1,
        }
    }
}

pub fn build_client(mode: GameMode) -> Result<Box<dyn GameClient>> {
    match mode {
        GameMode::Offline => Ok(Box::new(OfflineGameClient::new())),
        GameMode::Online => Ok(Box::new(OnlineGameClient::connect(
            "localhost:4000",
        )?)),
    }
}
