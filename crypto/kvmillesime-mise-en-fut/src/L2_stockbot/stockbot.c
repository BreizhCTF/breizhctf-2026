#include "stockbot.h"
#include "io.h"
#include "logger.h"
#include "micro_times.h"
#include "smallstring.h"

typedef struct {
    char name[16];
    int price;
} stock_t;

static stock_t g_stocks[] = {
    {"AAPL", 150},
    {"GOOG", 2800},
    {"TSLA", 700},
    {"AMZN", 3300},
    {"BTC", 45000}
};
#define NUM_STOCKS (sizeof(g_stocks) / sizeof(g_stocks[0]))

static int g_balance = 10000;

void list_stocks() {
    log_append(rdtsc(), "Listing stocks");
    print("Stock Market:\n");
    for (unsigned int i = 0; i < NUM_STOCKS; i++) {
        print("  ");
        print(g_stocks[i].name);
        print(": $");
        print_int(g_stocks[i].price);
        print("\n");
    }
}

void buy_stock(char *cmd) {
    // cmd is "buy <name> <qty>"
    char *name = cmd + 4;
    while (*name == ' ') name++;
    
    char *qty_str = name;
    while (*qty_str && *qty_str != ' ') qty_str++;
    
    if (*qty_str == ' ') {
        *qty_str = '\0';
        qty_str++;
        while (*qty_str == ' ') qty_str++;
    } else {
        print("Usage: buy <name> <qty>\n");
        return;
    }

    int qty = my_atoi(qty_str);
    if (qty <= 0) {
        print("Invalid quantity\n");
        return;
    }

    for (unsigned int i = 0; i < NUM_STOCKS; i++) {
        if (my_strcmp(name, g_stocks[i].name) == 0) {
            int cost = g_stocks[i].price * qty;
            if (g_balance >= cost) {
                g_balance -= cost;
                print("Bought ");
                print_int(qty);
                print(" shares of ");
                print(name);
                print(" for $");
                print_int(cost);
                print("\n");
                
                char log_msg[64] = "Bought ";
                int cur = 7;
                int name_len = my_strlen(name);
                my_memcpy(log_msg + cur, name, name_len);
                cur += name_len;
                my_memcpy(log_msg + cur, " x", 2);
                cur += 2;
                my_itoa(qty, log_msg + cur);
                
                log_append(rdtsc(), log_msg); 
            } else {
                print("Insufficient balance! Need $");
                print_int(cost);
                print("\n");
                log_append(rdtsc(), "Purchase failed: Insufficient balance");
            }
            return;
        }
    }
    print("Stock not found: ");
    print(name);
    print("\n");
    log_append(rdtsc(), "Purchase failed: Stock not found");
}

void show_balance() {
    log_append(rdtsc(), "Checking balance");
    print("Current balance: $");
    print_int(g_balance);
    print("\n");
}

void ai_optimize() {
    log_append(rdtsc(), "AI Optimization triggered");
    print("AI is analyzing market trends...\n");
    print("Executing high-frequency trades...\n");
    
    // Use rdtsc for "randomness"
    uint64_t seed = rdtsc();
    int loss_factor = ((uint32_t)seed % 90) + 10; // Lose 10% to 99%
    
    int loss = (g_balance * loss_factor) / 100;
    g_balance -= loss;
    
    print("AI analysis complete.\n");
    print("Result: Optimization failed due to 'unforeseen market volatility'.\n");
    print("Lost $");
    print_int(loss);
    print(" in transaction fees and slippage.\n");
    
    log_append(rdtsc(), "AI Optimization loss incurred");
}

#ifndef FLAG
#error "FLAG must be defined at compile time (e.g., make FLAG='your_flag')"
#endif

void show_flag() {
        print("Your flag: ");
        print(FLAG);
        print("\n");
        log_append(rdtsc(), "Flag requested");

}

void show_help() {
    print("Available commands:\n");
    print("  list             - List all stocks and their current prices\n");
    print("  buy <name> <qty> - Buy a stock\n");
    print("  balance          - Show current balance\n");
    print("  ai-optimize      - Let our proprietary AI grow your wealth (Experimental)\n");
    print("  logs [number]    - Show last N action logs (default 20)\n");
    print("  license          - Validate license key (hex)\n");
    print("  help             - Show this help message\n");
    print("  exit             - Exit the stock bot\n");
}

void show_banner() {
    print(" .----------------------------------------------------------.\n");
    print(" |   _    ___   ____ _____ ___   ____ _  __ ____   ___ ___  |\n");
    print(" |  / \\  |_ _| / ___|_   _/ _ \\ / ___| |/ /| __ ) / _ \\_ _| |\n");
    print(" | / _ \\  | |  \\___ \\ | || | | | |   | ' / |  _ \\| | | | |  |\n");
    print(" |/ ___ \\ | |   ___) || || |_| | |___| . \\ | |_) | |_| | |  |\n");
    print(" |_/   \\_\\___| |____/ |_| \\___/ \\____|_|\\_\\|____/ \\___/___| |\n");
    print(" |                                                          |\n");
    print(" |      >> AI-OPTIMIZED STOCK TRADING TERMINAL v1.0 <<      |\n");
    print(" |          \"Your money, our learned expertise\"           |\n");
    print(" '----------------------------------------------------------'\n\n");
}
