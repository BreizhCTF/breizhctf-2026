#ifndef NETWORK_H
#define NETWORK_H

/**
 * @brief Initializes the TCP server for guest communication.
 */
void init_network_server(void);

/**
 * @brief Main network polling loop. Handles new clients and incoming data.
 */
void process_network_events(void);

#endif
