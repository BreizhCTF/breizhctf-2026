#!/usr/bin/env python3
import io
from contextlib import redirect_stdout
from relang import Interpreter
from time import sleep

def run(query):
    """Executes the query through the actual Interpreter logic and captures the stack output."""
    f = io.StringIO()
    with redirect_stdout(f):
        try:
            Interpreter(query, can_getattr=True)
        except Exception as e:
            return e
    raw_output = f.getvalue().strip()
    return raw_output

def ask():
    try:
        inp = input("> ")
        out = run(inp)
        print(out)
    except:
        exit()


def run_challenge():
    print("Welcome to the RELANG esolang sandbox !")
    print("Loading sandbox...")

    while True:
        sleep(0.5)
        ask()

if __name__ == "__main__":
    run_challenge()
