#pragma once
#include <cstddef>
#include <cstring>
#include <string>

namespace obf_detail {

constexpr char nibble_swap(char c) {
    return static_cast<char>(((static_cast<unsigned char>(c) & 0x0F) << 4) |
                             ((static_cast<unsigned char>(c) & 0xF0) >> 4));
}

constexpr char enc(char c, char key) { return nibble_swap(c ^ key); }
constexpr char dec(char c, char key) { return nibble_swap(c) ^ key; }

constexpr char pos_key(char seed, size_t pos) {
    return static_cast<char>(seed ^ static_cast<char>((pos * 0x6B) & 0xFF));
}

template<size_t N, char Seed>
struct ObfStr {
    char data[N];
    constexpr ObfStr(const char (&s)[N]) {
        for (size_t i = 0; i < N; ++i)
            data[i] = enc(s[i], pos_key(Seed, i));
    }

    template<typename F>
    auto with(F&& f) const -> decltype(f(static_cast<const char*>(nullptr))) {
        char buf[N];
        for (size_t i = 0; i < N; ++i)
            buf[i] = dec(data[i], pos_key(Seed, i));
        auto result = f(static_cast<const char*>(buf));
        __builtin_memset(buf, 0, N);
        return result;
    }

    std::string str() const {
        return with([](const char* p) { return std::string(p); });
    }

    void decrypt_into(char* out) const {
        for (size_t i = 0; i < N; ++i)
            out[i] = dec(data[i], pos_key(Seed, i));
    }
};

} // namespace obf_detail

#define OBFSTR(s) \
    (::obf_detail::ObfStr< \
        sizeof(s), \
        static_cast<char>((__COUNTER__ * 0x5D) ^ 0xA3) \
    >(s))

#define OBFSTR_USE(obf, varname, block)        \
    do {                                        \
        char varname[sizeof((obf).data)];       \
        (obf).decrypt_into(varname);            \
        block                                   \
        __builtin_memset(varname, 0, sizeof((obf).data)); \
    } while(0)
