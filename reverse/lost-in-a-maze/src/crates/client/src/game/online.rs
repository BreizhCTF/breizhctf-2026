use crate::game::client::{GameClient, MoveOutcome};
use aes_gcm::{
    Aes256Gcm, Nonce,
    aead::{Aead, KeyInit, consts::U12},
};
use color_eyre::eyre::{Result, eyre};
use packets::{
    MazeSize, PlayerMoveDirection,
    client::Packet as ClientPacket,
    server::{GameSnapshot, Packet as ServerPacket},
};
use rkyv::{from_bytes, rancor::Error as RancorError, to_bytes};
use sha2::{Digest, Sha256};
use std::{
    net::{SocketAddr, ToSocketAddrs, UdpSocket},
    time::Duration,
};

#[derive(Debug)]
pub struct OnlineConnection {
    socket: UdpSocket,
    server: SocketAddr,
    last_payload: Option<Vec<u8>>,
}

impl OnlineConnection {
    pub fn connect(address: &str) -> Result<Self> {
        let mut resolved = address
            .to_socket_addrs()
            .map_err(|e| eyre!("failed to resolve {address}: {e}"))?;
        let server: SocketAddr = resolved
            .next()
            .ok_or_else(|| eyre!("no address found for {address}"))?;
        let socket = UdpSocket::bind("0.0.0.0:0")?;
        socket.set_read_timeout(Some(Duration::from_secs(2))).ok();

        Ok(Self {
            socket,
            server,
            last_payload: None,
        })
    }

    fn send_bytes(&mut self, bytes: &[u8]) -> Result<()> {
        let payload = if let Some(last) = &self.last_payload {
            let (cipher, nonce) = build_cipher(last)?;
            cipher.encrypt(&nonce, bytes).map_err(|e| eyre!(e))?
        } else {
            bytes.to_vec()
        };
        self.socket.send_to(&payload, self.server)?;
        self.last_payload = Some(bytes.to_vec()); // store plaintext
        Ok(())
    }

    fn recv_bytes(&mut self) -> Result<Vec<u8>> {
        let mut buf = vec![0u8; 4096];
        let (len, _) = self.socket.recv_from(&mut buf)?;
        let payload = &buf[..len];
        if let Some(last) = &self.last_payload {
            let (cipher, nonce) = build_cipher(last)?;
            match cipher.decrypt(&nonce, payload) {
                Ok(bytes) => {
                    self.last_payload = Some(bytes.clone());
                    Ok(bytes)
                }
                Err(_) => {
                    // Fallback: treat as plaintext (e.g., server reset after victory)
                    let plain = payload.to_vec();
                    self.last_payload = Some(plain.clone());
                    Ok(plain)
                }
            }
        } else {
            let plain = payload.to_vec();
            self.last_payload = Some(plain.clone());
            Ok(plain)
        }
    }
}

#[derive(Debug)]
pub struct OnlineGameClient {
    connection: OnlineConnection,
    snapshot: Option<GameSnapshot>,
}

impl OnlineGameClient {
    pub fn new(connection: OnlineConnection) -> Self {
        Self {
            connection,
            snapshot: None,
        }
    }

    pub fn connect(address: &str) -> Result<Self> {
        Ok(Self::new(OnlineConnection::connect(address)?))
    }
}

impl GameClient for OnlineGameClient {
    fn available_maze_sizes(&mut self) -> Result<Vec<MazeSize>> {
        let req = ClientPacket::MazeSizesRequest;
        let bytes = to_bytes::<RancorError>(&req).map_err(|e| eyre!(e))?;
        self.connection.send_bytes(&bytes)?;
        let resp_bytes = self.connection.recv_bytes()?;
        match from_bytes::<ServerPacket, RancorError>(&resp_bytes).map_err(|e| eyre!(e))? {
            ServerPacket::MazeSizesResponse(sizes) => Ok(sizes),
            ServerPacket::ErrorResponse(msg) => Err(eyre!(msg)),
            _ => Err(eyre!("invalid response for sizes")),
        }
    }

    fn start_game(&mut self, size: MazeSize) -> Result<GameSnapshot> {
        let req = ClientPacket::StartRequest(size);
        let bytes = to_bytes::<RancorError>(&req).map_err(|e| eyre!(e))?;
        self.connection.send_bytes(&bytes)?;
        let resp_bytes = self.connection.recv_bytes()?;
        match from_bytes::<ServerPacket, RancorError>(&resp_bytes).map_err(|e| eyre!(e))? {
            ServerPacket::SnapshotResponse(snap) => {
                self.snapshot = Some(snap.clone());
                Ok(snap)
            }
            ServerPacket::ErrorResponse(msg) => Err(eyre!(msg)),
            _ => Err(eyre!("invalid response for start")),
        }
    }

    fn snapshot(&self) -> Option<GameSnapshot> {
        self.snapshot.clone()
    }

    fn move_player(&mut self, direction: PlayerMoveDirection) -> Result<MoveOutcome> {
        let req = ClientPacket::MoveRequest(direction);
        let bytes = to_bytes::<RancorError>(&req).map_err(|e| eyre!(e))?;
        self.connection.send_bytes(&bytes)?;
        let resp_bytes = self.connection.recv_bytes()?;
        match from_bytes::<ServerPacket, RancorError>(&resp_bytes).map_err(|e| eyre!(e))? {
            ServerPacket::MoveResponse(result) => {
                let snap = self
                    .snapshot
                    .as_mut()
                    .ok_or_else(|| eyre!("missing snapshot"))?;
                snap.player = result.player;
                Ok(MoveOutcome::Moved)
            }
            ServerPacket::VictoryResponse(msg) => {
                // best-effort: advance local snapshot to reflect the move
                if let Some(snap) = self.snapshot.as_mut() {
                    let mut pos = snap.player;
                    match direction {
                        PlayerMoveDirection::Up => {
                            if pos.y > 0 {
                                pos.y -= 1;
                            }
                        }
                        PlayerMoveDirection::Down => pos.y += 1,
                        PlayerMoveDirection::Left => {
                            if pos.x > 0 {
                                pos.x -= 1;
                            }
                        }
                        PlayerMoveDirection::Right => pos.x += 1,
                    }
                    snap.player = pos;
                }
                Ok(MoveOutcome::Victory(msg))
            }
            ServerPacket::ErrorResponse(msg) => Err(eyre!(msg)),
            _ => Err(eyre!("invalid move response")),
        }
    }
}

fn build_cipher(last_packet: &[u8]) -> Result<(Aes256Gcm, Nonce<U12>)> {
    let mut hasher = Sha256::new();
    hasher.update(last_packet);
    let digest = hasher.finalize();

    let cipher = Aes256Gcm::new_from_slice(&digest).map_err(|e| eyre!(e))?;
    let nonce = *Nonce::<U12>::from_slice(&digest[..12]);

    Ok((cipher, nonce))
}
