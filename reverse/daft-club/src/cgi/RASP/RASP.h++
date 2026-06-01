#pragma once

#include <cstdint>
#include <cstdlib>
#include <cstring>
#include <string>
#include <fstream>
#include <sstream>
#include <unistd.h>
#include <sys/ptrace.h>
#include <sys/wait.h>
#include <sys/types.h>
#include <fcntl.h>
#include <dlfcn.h>

#include "ObfStr.h++"

static volatile bool g_tampered = false;

namespace rasp_detail {

template<typename Fn>
static void run_in_child(Fn check_fn) {
    int pipefd[2];
    if (::pipe(pipefd) != 0) { g_tampered = true; return; }

    pid_t pid = ::fork();
    if (pid < 0) {
        ::close(pipefd[0]); ::close(pipefd[1]);
        g_tampered = true; return;
    }

    if (pid == 0) {
        ::close(pipefd[0]);
        uint8_t result = check_fn() ? 0x00 : 0x01;
        ::write(pipefd[1], &result, 1);
        ::close(pipefd[1]);
        ::_exit(0);
    }

    ::close(pipefd[1]);
    uint8_t result = 0x01;
    ::read(pipefd[0], &result, 1);
    ::close(pipefd[0]);

    int status = 0;
    ::waitpid(pid, &status, 0);

    if (result != 0x00) g_tampered = true;
}

static bool check_tracer_pid() {
    static const auto path = OBFSTR("/proc/self/status");
    static const auto key  = OBFSTR("TracerPid:");

    std::ifstream f(path.str());
    if (!f.is_open()) return false;

    std::string line;
    std::string key_s = key.str();
    while (std::getline(f, line)) {
        if (line.compare(0, key_s.size(), key_s) == 0) {
            std::istringstream ss(line.substr(key_s.size()));
            int tracer = -1;
            ss >> tracer;
            return tracer == 0;
        }
    }
    return false;
}

static bool check_ptrace() {
    long ret = ::ptrace(PTRACE_TRACEME, 0, nullptr, nullptr);
    if (ret == -1) return false;
    ::ptrace(PTRACE_DETACH, 0, nullptr, nullptr);
    return true;
}

// Runs in a forked child: child's parent = validator, validator's parent = fcgiwrap.
// Walk up two levels to check the grandparent comm.
static bool check_parent_comm() {
    static const auto expected    = OBFSTR("fcgiwrap");
    static const auto fmt_status  = OBFSTR("/proc/%d/status");
    static const auto fmt_comm    = OBFSTR("/proc/%d/comm");
    static const auto ppid_key    = OBFSTR("PPid:");

    std::string fmt_status_s = fmt_status.str();
    std::string fmt_comm_s   = fmt_comm.str();
    std::string ppid_key_s   = ppid_key.str();

    pid_t validator_pid = ::getppid();
    if (validator_pid <= 1) return false;

    char status_path[64];
    ::snprintf(status_path, sizeof(status_path), fmt_status_s.c_str(), (int)validator_pid);

    pid_t fcgiwrap_pid = -1;
    {
        std::ifstream f(status_path);
        if (!f.is_open()) return false;
        std::string line;
        while (std::getline(f, line)) {
            if (line.compare(0, ppid_key_s.size(), ppid_key_s) == 0) {
                std::istringstream ss(line.substr(ppid_key_s.size()));
                ss >> fcgiwrap_pid;
                break;
            }
        }
    }
    if (fcgiwrap_pid <= 1) return false;

    char comm_path[64];
    ::snprintf(comm_path, sizeof(comm_path), fmt_comm_s.c_str(), (int)fcgiwrap_pid);

    std::ifstream f(comm_path);
    if (!f.is_open()) return false;

    std::string comm;
    std::getline(f, comm);
    while (!comm.empty() && (comm.back() == '\n' || comm.back() == '\r'))
        comm.pop_back();

    return comm == expected.str();
}

static bool check_ld_preload() {
    static const auto key = OBFSTR("LD_PRELOAD");
    const char* val = ::getenv(key.str().c_str());
    return val == nullptr || val[0] == '\0';
}

static bool check_maps() {
    static const auto path = OBFSTR("/proc/self/maps");
    static const auto p1 = OBFSTR("frida");
    static const auto p2 = OBFSTR("pin-");
    static const auto p3 = OBFSTR("valgrind");
    static const auto p4 = OBFSTR("dynamorio");
    static const auto p5 = OBFSTR("libasan");
    static const auto p6 = OBFSTR("libubsan");

    std::string patterns[] = {
        p1.str(), p2.str(), p3.str(), p4.str(), p5.str(), p6.str()
    };

    std::ifstream f(path.str());
    if (!f.is_open()) return false;

    std::string line;
    while (std::getline(f, line))
        for (const auto& pat : patterns)
            if (line.find(pat) != std::string::npos) return false;

    return true;
}

static bool check_got_hooks() {
    static const auto maps_path = OBFSTR("/proc/self/maps");
    static const auto libc_tag  = OBFSTR("libc");
    static const auto sym_name  = OBFSTR("strcmp");

    std::string maps_s = maps_path.str();
    std::string libc_s = libc_tag.str();

    uintptr_t libc_start = 0, libc_end = 0;
    {
        std::ifstream f(maps_s);
        if (!f.is_open()) return false;
        std::string line;
        while (std::getline(f, line)) {
            if (line.find(libc_s) != std::string::npos &&
                line.find(".so") != std::string::npos) {
                uintptr_t s = 0, e = 0;
                if (::sscanf(line.c_str(), "%lx-%lx", &s, &e) == 2) {
                    if (libc_start == 0 || s < libc_start) libc_start = s;
                    if (e > libc_end) libc_end = e;
                }
            }
        }
    }
    if (libc_start == 0 || libc_end == 0) return false;

    void* sym = ::dlsym(RTLD_DEFAULT, sym_name.str().c_str());
    if (!sym) return false;

    uintptr_t addr = reinterpret_cast<uintptr_t>(sym);
    return addr >= libc_start && addr < libc_end;
}

static void spawn_decoy() {
    pid_t pid = ::fork();
    if (pid == 0) {
        volatile uint64_t x = 0xDEADBEEFCAFEBABEULL;
        for (int i = 0; i < 50000; ++i) x = (x ^ (x >> 17)) * 0x6C62272E07BB0142ULL;
        (void)x;
        ::_exit(0);
    }
    if (pid > 0) ::waitpid(pid, nullptr, 0);
}

} // namespace rasp_detail

using CheckFn = bool(*)();

static CheckFn s_checks[] = {
    rasp_detail::check_tracer_pid,
    rasp_detail::check_ptrace,
    rasp_detail::check_parent_comm,
    rasp_detail::check_ld_preload,
    rasp_detail::check_maps,
    rasp_detail::check_got_hooks,
};

static constexpr size_t s_num_checks = sizeof(s_checks) / sizeof(s_checks[0]);

#ifdef RASP_DEBUG
static const char* s_check_names[] = {
    "check_tracer_pid", "check_ptrace", "check_parent_comm",
    "check_ld_preload", "check_maps",  "check_got_hooks",
};
#endif

static void rasp_init() {
    ::srand(static_cast<unsigned>(::getpid()) ^ static_cast<unsigned>(::getppid()));

#ifdef RASP_DEBUG
    bool was_tampered = g_tampered;
#endif
    for (size_t i = 0; i < s_num_checks; ++i) {
        rasp_detail::run_in_child(s_checks[i]);
#ifdef RASP_DEBUG
        if (g_tampered && !was_tampered) {
            ::write(STDERR_FILENO, "[RASP] FAIL: ", 13);
            ::write(STDERR_FILENO, s_check_names[i], __builtin_strlen(s_check_names[i]));
            ::write(STDERR_FILENO, "\n", 1);
        }
        was_tampered = g_tampered;
#endif
    }
    rasp_detail::spawn_decoy();
}

static void rasp_tick() {
    size_t idx = static_cast<size_t>(::rand()) % s_num_checks;
    rasp_detail::run_in_child(s_checks[idx]);
    if ((::rand() % 4) == 0) rasp_detail::spawn_decoy();
}

static bool rasp_is_clean() { return !g_tampered; }
