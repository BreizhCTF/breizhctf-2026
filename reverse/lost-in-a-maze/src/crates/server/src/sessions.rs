use game::Game;
use std::{collections::HashMap, net::SocketAddr, sync::Arc};
use tokio::sync::Mutex;

#[derive(Debug, Default)]
pub struct Session {
    pub last_decrypted_payload: Option<Vec<u8>>,
    pub game: Option<Game>,
}

pub type Sessions = Arc<Mutex<HashMap<SocketAddr, Session>>>;
