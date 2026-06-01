use crate::sessions::{Session, Sessions};
use game::Game;
use packets::{
    MazeSize, PlayerMoveDirection, AVAILABLE_MAZE_SIZES, client::Packet as ClientPacket,
    server::Packet as ServerPacket,
};
use std::net::SocketAddr;

pub async fn process_request(
    sessions: &Sessions,
    address: SocketAddr,
    packet: ClientPacket,
) -> ServerPacket {
    match packet {
        ClientPacket::MazeSizesRequest => handle_sizes(),
        ClientPacket::StartRequest(size) => handle_start(sessions, address, size).await,
        ClientPacket::MoveRequest(direction) => {
            handle_player_move(sessions, address, direction).await
        }
    }
}

fn handle_sizes() -> ServerPacket {
    ServerPacket::MazeSizesResponse(AVAILABLE_MAZE_SIZES.to_vec())
}

async fn handle_start(sessions: &Sessions, address: SocketAddr, size: MazeSize) -> ServerPacket {
    let game = Game::new(size.width as usize, size.height as usize);
    let snapshot = game.snapshot().into();

    let mut guard = sessions.lock().await;
    let session = guard.entry(address).or_insert_with(Session::default);
    session.game = Some(game);

    ServerPacket::SnapshotResponse(snapshot)
}

async fn handle_player_move(
    sessions: &Sessions,
    address: SocketAddr,
    direction: PlayerMoveDirection,
) -> ServerPacket {
    let direction = direction.into();
    let mut guard = sessions.lock().await;

    let Some(session) = guard.get_mut(&address) else {
        return ServerPacket::ErrorResponse("Game not started".into());
    };

    let Some(game) = session.game.as_mut() else {
        return ServerPacket::ErrorResponse("Game not started".into());
    };

    let position = game.move_player(direction);

    if game.victory() {
        session.game = None;
        let victory_message = std::env::var("VICTORY_MESSAGE")
            .expect("Environment variable VICTORY_MESSAGE must be set");

        ServerPacket::VictoryResponse(victory_message)
    } else {
        ServerPacket::MoveResponse(position.into())
    }
}
