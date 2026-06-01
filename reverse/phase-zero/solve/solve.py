ENCODED = [0x66, 0x6F, 0x62, 0x67, 0x7D, 0x6C, 0x4F, 0x1A, 0x44]
ENCODED += [0x19, 0x1C, 0x75, 0x1C, 0x57, 0x58, 0x1C, 0x52, 0x57]
OFFSETS = [2, 1, 0]


def solve():
    flag = bytearray(len(ENCODED))
    for index in range(len(ENCODED)):
        flag[index] = (ENCODED[index] + OFFSETS[index % 3]) ^ 0x2A
    return flag.decode()


def main():
    flag = solve()
    print(f"Flag: {flag}")


if __name__ == "__main__":
    main()
