use aes_gcm::aead::Aead;
use eyre::{Result, eyre};
use packets::{client::Packet as ClientPacket, server::Packet as ServerPacket};
use rkyv::rancor::Error as RancorError;
use sessions::{Session, Sessions};
use std::{net::SocketAddr, sync::Arc};
use tokio::{net::UdpSocket, sync::Mutex};

mod cryptography;
mod handlers;
mod sessions;

const LISTEN_ADDRESS: &str = "0.0.0.0:4000";

#[tokio::main]
async fn main() -> Result<()> {
    let socket = Arc::new(UdpSocket::bind(LISTEN_ADDRESS).await?);
    let sessions: Sessions = Arc::new(Mutex::new(std::collections::HashMap::new()));

    loop {
        let mut buffer = vec![0u8; 4096];

        let (length, address) = match socket.recv_from(&mut buffer).await {
            Ok(result) => result,
            Err(error) => {
                eprintln!("receive error: {error}");

                continue;
            }
        };

        let payload = buffer[..length].to_vec();
        let sessions = sessions.clone();
        let socket = socket.clone();

        tokio::spawn(async move {
            if let Err(error) = handle_packet(socket, address, sessions, payload).await {
                eprintln!("packet from {address} failed: {error:?}");
            }
        });
    }
}

async fn handle_packet(
    socket: Arc<UdpSocket>,
    address: SocketAddr,
    sessions: Sessions,
    payload: Vec<u8>,
) -> Result<()> {
    let decrypted_packet = decrypt_incoming_packet(&sessions, address, &payload).await?;
    let request = rkyv::from_bytes::<ClientPacket, RancorError>(&decrypted_packet)
        .map_err(|error| eyre!(error))?;
    let response = handlers::process_request(&sessions, address, request).await;

    let response_bytes = rkyv::to_bytes::<RancorError>(&response).map_err(|error| eyre!(error))?;
    let encrypted_packet = encrypt_outgoing_packet(&sessions, address, &response_bytes).await?;
    socket.send_to(&encrypted_packet, address).await?;

    if matches!(response, ServerPacket::VictoryResponse(_)) {
        sessions.lock().await.remove(&address);
    }

    Ok(())
}

async fn decrypt_incoming_packet(
    sessions: &Sessions,
    address: SocketAddr,
    payload: &[u8],
) -> Result<Vec<u8>> {
    let last_decrypted_payload = {
        sessions
            .lock()
            .await
            .entry(address)
            .or_insert_with(Session::default)
            .last_decrypted_payload
            .clone()
    };

    let packet: Vec<u8> = if let Some(last_decrypted_payload) = last_decrypted_payload {
        let (cipher, nonce) = cryptography::build_cipher(&last_decrypted_payload)?;

        cipher
            .decrypt(&nonce, payload)
            .map_err(|error| eyre!(error))?
    } else {
        payload.to_vec()
    };

    if let Some(session) = sessions.lock().await.get_mut(&address) {
        session.last_decrypted_payload = Some(packet.clone());
    }

    Ok(packet)
}

async fn encrypt_outgoing_packet(
    sessions: &Sessions,
    address: SocketAddr,
    payload: &[u8],
) -> Result<Vec<u8>> {
    let last_decrypted_payload = {
        sessions
            .lock()
            .await
            .entry(address)
            .or_insert_with(Session::default)
            .last_decrypted_payload
            .clone()
    };

    let packet = if let Some(last_decrypted_payload) = last_decrypted_payload {
        let (cipher, nonce) = cryptography::build_cipher(&last_decrypted_payload)?;

        cipher
            .encrypt(&nonce, payload)
            .map_err(|error| eyre!(error))?
    } else {
        payload.to_vec()
    };

    if let Some(session) = sessions.lock().await.get_mut(&address) {
        session.last_decrypted_payload = Some(payload.to_vec());
    }

    Ok(packet)
}
