# Daft Club

**Category:** Reverse | **Difficulty:** Hard

A fake 2001-era music website where players must redeem a CD key to download an
exclusive Daft Punk track. The "exclusive track" is the flag.

## Architecture

```
nginx (port 80)
  └── POST /redeem → fcgiwrap → CGI binary (validator)
                                  └── whitebox AES-128 key check
```

The validator binary implements a **Chow et al. whitebox AES-128** (linear
encoding variant). The AES key is never present in the binary — it is baked
into ~364 KB of encoded lookup tables. Players must reverse the whitebox to
recover the correct CD key.

## Setup

```bash
# Generate distributable files (requires Docker)
./gen_files.sh

# Build and run the challenge
docker build -t daft_club src/
docker run -p 8080:80 daft_club
```

## Regenerating the whitebox tables

The whitebox tables (`src/cgi/DaftClubDRM/wb_tables.h`) are committed and baked
into the Docker image at build time. To change the secret key or CD key:

```bash
cd src/cgi
make wbgen
./wbgen <key_hex_32chars> "DAFT-XXXXX-XXXXX-XXXXX"
# wb_tables.h is regenerated — commit it, then rebuild
make
```



# Notes 

