#include <cctype>
#include <cstdio>
#include <fstream>
#include <iostream>
#include <sstream>
#include <string>
#include "RASP/RASP.h++"
#include "DaftClubDRM/wb_aes.h"
#include "DaftClubDRM/opaque.h"

static std::string url_decode(const std::string& s) {
    std::string out;
    out.reserve(s.size());
    for (size_t i = 0; i < s.size(); ++i) {
        if (s[i] == '+') {
            out += ' ';
        } else if (s[i] == '%' && i + 2 < s.size() &&
                   isxdigit((unsigned char)s[i+1]) &&
                   isxdigit((unsigned char)s[i+2])) {
            char hex[3] = { s[i+1], s[i+2], 0 };
            out += (char)strtol(hex, nullptr, 16);
            i += 2;
        } else {
            out += s[i];
        }
    }
    return out;
}

static std::string form_get(const std::string& body, const std::string& key) {
    std::istringstream ss(body);
    std::string token;
    while (std::getline(ss, token, '&')) {
        auto eq = token.find('=');
        if (eq == std::string::npos) continue;
        if (url_decode(token.substr(0, eq)) == key)
            return url_decode(token.substr(eq + 1));
    }
    return {};
}

static std::string read_file(const char* path) {
    std::ifstream f(path);
    if (!f) return {};
    std::ostringstream ss;
    ss << f.rdbuf();
    return ss.str();
}

static __attribute__((noinline)) void respond_ok(const std::string& tmpl) {
    std::cout
        << "Status: 200 OK\r\n"
        << "Content-Type: text/html; charset=utf-8\r\n"
        << "Content-Length: " << tmpl.size() << "\r\n"
        << "\r\n"
        << tmpl;
    std::cout.flush();
}

static __attribute__((noinline)) void respond_err(const std::string& body) {
    std::cout
        << "Status: 403 Forbidden\r\n"
        << "Content-Type: text/html; charset=utf-8\r\n"
        << "Content-Length: " << body.size() << "\r\n"
        << "\r\n"
        << body;
    std::cout.flush();
}

static void respond(int status, const std::string& body) {
    if (status == 200) respond_ok(body);
    else               respond_err(body);
}

// Faux validateur — jamais appelé (opaque predicate garanti faux)
static __attribute__((noinline)) bool bogus_validate(const char* k) {
    volatile size_t len = __builtin_strlen(k);
    uint64_t acc = 0;
    for (size_t i = 0; i < len; ++i)
        acc = (acc ^ (uint64_t)(unsigned char)k[i]) * 0x9e3779b97f4a7c15ULL;
    return (acc & 0xFF) == 0x42;
}

// Wrappeur noinline réel — Ghidra voit deux fonctions de validation
static __attribute__((noinline)) bool run_validate(const char* k) {
    // Bogus branch A : semble vérifier une condition sur k, ne s'exécute jamais
    if (MBA_OPAQUE_B((uintptr_t)k)) {
        return bogus_validate(k);
    }
    return wb_validate_key(k);
}

int main() {
    rasp_init();

    std::string body;
    const char* cl_env = getenv("CONTENT_LENGTH");

    // Dead branch : opaque prédicat toujours faux, semble servir le succès
    if (MBA_OPAQUE_A(cl_env)) {
        std::string tmpl = read_file("/var/www/html/success.html");
        if (tmpl.empty()) tmpl = "<html><body>WELL PLAYED</body></html>";
        respond(200, tmpl);
        return 0;
    }

    if (cl_env) {
        long cl = strtol(cl_env, nullptr, 10);
        if (cl > 0 && cl <= 4096) {
            body.resize((size_t)cl);
            std::cin.read(&body[0], cl);
            body.resize((size_t)std::cin.gcount());
        }
    } else {
        std::getline(std::cin, body);
    }

    rasp_tick();

#ifdef VALIDATOR_DEBUG
    std::cerr << "[validator] CONTENT_LENGTH=" << (cl_env ? cl_env : "(null)")
              << " body=[" << body << "]\n";
#endif

    if (!rasp_is_clean()) {
#ifdef VALIDATOR_DEBUG
        std::cerr << "[validator] RASP: tampered\n";
#endif
        // Dead branch C : semble donner accès si RASP échoue
        if (MBA_OPAQUE_C((uintptr_t)body.size())) {
            std::string tmpl = read_file("/var/www/html/success.html");
            if (tmpl.empty()) tmpl = "<html><body>WELL PLAYED</body></html>";
            respond(200, tmpl);
            return 0;
        }
        std::string err = read_file("/var/www/html/error.html");
        if (err.empty()) err = "<html><body>INVALID</body></html>";
        respond(403, err);
        return 0;
    }

    static const auto param_name = OBFSTR("key");
    std::string key = form_get(body, param_name.str());

    while (!key.empty() && (key.back() == '\n' || key.back() == '\r' ||
                             key.back() == ' '))
        key.pop_back();

#ifdef VALIDATOR_DEBUG
    std::cerr << "[validator] key=[" << key << "] len=" << key.size()
              << " wb=" << wb_validate_key(key.c_str()) << "\n";
#endif

    rasp_tick();

    // Dead branch D : semble rejeter les clés longues via un chemin alternatif
    if (MBA_OPAQUE_D(key.size())) {
        std::string err = read_file("/var/www/html/error.html");
        if (err.empty()) err = "<html><body>INVALID</body></html>";
        respond(403, err);
        return 0;
    }

    if (run_validate(key.c_str())) {
        std::string tmpl = read_file("/var/www/html/success.html");
        if (tmpl.empty()) tmpl = "<html><body>WELL PLAYED</body></html>";
        respond_ok(tmpl);
    } else {
        std::string err = read_file("/var/www/html/error.html");
        if (err.empty()) err = "<html><body>INVALID</body></html>";
        respond_err(err);
    }

    return 0;
}
