#include <sys/socket.h>
#include <netinet/in.h>
#include <fcntl.h>
#include <unistd.h>
#include <poll.h>
#include <stdio.h>
#include <string.h>
#include "network.h"
#include "state.h"
#include "crypto.h"
#include "memory.h"

/**
 * @brief Manages session locking based on the command being sent.
 */
static void _manage_session_locking(uint8_t command, int client_idx) {
    if (!state.minting_in_progress) {
        state.active_client_idx = client_idx;
    }
    
    if (command == CMD_MINT_NFT) {
        state.minting_in_progress = 1;
        state.input_head = state.input_tail;
    }
}

/**
 * @brief Pushes a command byte into the guest's input queue.
 */
static void _push_byte_to_guest(uint8_t byte) {
    int next_tail = (state.input_tail + 1) % 4096;
    if (next_tail != state.input_head) {
        state.input_queue[state.input_tail] = byte;
        state.input_tail = next_tail;
        pthread_cond_signal(&state.cv_input);
    }
}

/**
 * @brief Processes a single client command.
 */
static int payload_bytes_remaining = 0;

static void _execute_client_command(uint8_t command, int client_idx) {
    pthread_mutex_lock(&state.mtx);

    // Si on est en train de lire un payload, on transmet l'octet au Guest
    if (payload_bytes_remaining > 0) {
        payload_bytes_remaining--;
        _push_byte_to_guest(command);
    } 
    else {
        // C'est un nouvel octet de commande
        if (command == CMD_BEGIN_MINDFULNESS) {
            if (state.minting_in_progress) {
                uint8_t nack = 0x01;
                int fd = state.client_fds[client_idx];
                if (fd != -1) write(fd, &nack, 1);
            } else {
                struct rsa_params new_params;
                generate_session_keys(&new_params);
                
                uint8_t ack = 0;
                int fd = state.client_fds[client_idx];
                if (fd != -1) write(fd, &ack, 1);
            }
        } else {
            // Définir la taille du payload attendu selon la commande
            if (command == CMD_MINT_NFT) payload_bytes_remaining = 32;
            else if (command == CMD_WITHDRAW_FUNDS) payload_bytes_remaining = 32 + 128; 
            else if (command == CMD_CHECK_SANCTIONS) payload_bytes_remaining = 128;
            else if (command == CMD_ABORT_MINT) payload_bytes_remaining = 32;

            _manage_session_locking(command, client_idx);
            _push_byte_to_guest(command);
        }
    }

    pthread_mutex_unlock(&state.mtx);
}


/**
 * @brief Accepts a new client connection.
 */
static void _accept_new_connection(void) {
    int client_fd = accept(state.server_fd, NULL, NULL);
    if (client_fd < 0) return;

    for (int i = 0; i < MAX_CLIENTS; i++) {
        if (state.client_fds[i] == -1) {
            state.client_fds[i] = client_fd;
            return;
        }
    }
    close(client_fd);
}

/**
 * @brief Reads and processes incoming data from a client socket.
 */
static void _read_client_data(int client_idx) {
    int fd = state.client_fds[client_idx];
    uint8_t buffer[1024];
    ssize_t bytes_read = read(fd, buffer, sizeof(buffer));

    if (bytes_read <= 0) {
        close(fd);
        state.client_fds[client_idx] = -1;
    } else {
        for (ssize_t i = 0; i < bytes_read; i++) {
            _execute_client_command(buffer[i], client_idx);
        }
    }
}

// ----------------------------------------------------------------------------
// PUBLIC FUNCTIONS
// ----------------------------------------------------------------------------

void init_network_server(void) {
    state.server_fd = socket(AF_INET, SOCK_STREAM, 0);
    int opt = 1;
    setsockopt(state.server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));
    
    struct sockaddr_in addr = {
        .sin_family = AF_INET,
        .sin_port = htons(1338),
        .sin_addr.s_addr = INADDR_ANY
    };
    
    bind(state.server_fd, (struct sockaddr *)&addr, sizeof(addr));
    listen(state.server_fd, 5);
    fcntl(state.server_fd, F_SETFL, O_NONBLOCK);
    
    for (int i = 0; i < MAX_CLIENTS; i++) state.client_fds[i] = -1;
}

void process_network_events(void) {
    struct pollfd fds[MAX_CLIENTS + 1];
    
    fds[0].fd = state.server_fd;
    fds[0].events = POLLIN;
    
    for (int i = 0; i < MAX_CLIENTS; i++) {
        fds[i+1].fd = state.client_fds[i];
        fds[i+1].events = (state.client_fds[i] != -1) ? POLLIN : 0;
    }
    
    if (poll(fds, MAX_CLIENTS + 1, 100) < 0) return;
    
    if (fds[0].revents & POLLIN) {
        _accept_new_connection();
    }
    
    for (int i = 0; i < MAX_CLIENTS; i++) {
        if (state.client_fds[i] != -1 && (fds[i+1].revents & POLLIN)) {
            _read_client_data(i);
        }
    }
}
