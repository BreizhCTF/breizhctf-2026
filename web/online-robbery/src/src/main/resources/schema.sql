CREATE TABLE IF NOT EXISTS users (
    id IDENTITY PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    balance DECIMAL(20, 2) DEFAULT 0.00
);
CREATE TABLE IF NOT EXISTS transactions (
    id IDENTITY PRIMARY KEY,
    sender_id BIGINT,
    receiver_id BIGINT,
    amount DECIMAL(20, 2) NOT NULL,
    message VARCHAR(1000),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (receiver_id) REFERENCES users(id)
);
