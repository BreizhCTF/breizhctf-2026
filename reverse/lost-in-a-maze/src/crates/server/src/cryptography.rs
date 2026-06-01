use aes_gcm::{
    Aes256Gcm, Nonce,
    aead::{KeyInit, consts::U12},
};
use eyre::{Result, eyre};
use sha2::{Digest, Sha256};

pub type Cipher = Aes256Gcm;
pub type CipherNonce = Nonce<U12>;

pub fn build_cipher(last_decrypted_payload: &[u8]) -> Result<(Cipher, CipherNonce)> {
    let mut hasher = Sha256::new();
    hasher.update(last_decrypted_payload);
    let digest = hasher.finalize();

    let cipher = Aes256Gcm::new_from_slice(&digest).map_err(|error| eyre!(error))?;
    let nonce = *Nonce::from_slice(&digest[..12]);

    Ok((cipher, nonce))
}
