use crate::{MazeSize, PlayerMoveDirection};
use rkyv::{Archive, Deserialize, Serialize};

#[derive(Debug, Archive, Serialize, Deserialize)]
pub enum Packet {
    MazeSizesRequest,
    StartRequest(MazeSize),
    MoveRequest(PlayerMoveDirection),
}
