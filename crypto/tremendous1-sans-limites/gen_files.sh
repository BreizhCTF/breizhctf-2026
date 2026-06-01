#!/bin/sh

uv run --env-file src/env src/generate.py
cp leak.txt files/
cp src/generate.py files/challenge.py
