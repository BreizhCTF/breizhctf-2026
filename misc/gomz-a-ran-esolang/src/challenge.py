#!/usr/bin/env python3
import random
import string
import io
from contextlib import redirect_stdout
from relang import Interpreter
import re

# Global settings
separator = '-' * 20

def run(query, inputs=[]):
    """Executes the query through the actual Interpreter logic and captures the stack output."""
    f = io.StringIO()
    with redirect_stdout(f):
        try:
            Interpreter(query, inputs=inputs, can_getattr=False)
        except Exception as e:
            return str(e).split('\n')
    raw_output = f.getvalue().strip()
    return raw_output.split('\n')

def ask():
    print(separator)
    
    # Get input
    """user_input = []
    inp = input("> ").strip()
    while inp != "<EOF>":
        user_input.append(inp)
        inp = input("> ").strip()
    user_input = '\n'.join(user_input)"""
    user_input = input("> ")
    
    return user_input

def verify_cases(cases, user_program):
    for i, case in enumerate(cases, start=1):
        output = run(user_program, [e for e in case['inputs']])
        if output != case['expected']:
            print(f'\tTest {i} failed :(')
            print('Inputs:', case['inputs'])
            print('Received:\n', '\n'.join(output), sep='')
            print('Expected:\n', '\n'.join(case['expected']), sep='')
            return False
        else:
            print(f'\tTest {i} succeeded :)')
    
    return True




# --- Challs ---

def additions():
    # Random stuff
    d = lambda: random.randint(0,20)

    # Generate cases
    cases = []
    for _ in range(50):
        n1, n2 = d(), d()
        cases.append({
            'inputs':[n1,n2],
            'expected':[n1+n2,[]]
        })

    for case in cases:
        case['expected'] = [str(e) for e in case['expected']]

    # Get input program
    print('Task 1: you are given 2 numbers as input. Print their sum.')
    user_program = ask()

    # Run cases
    return verify_cases(cases, user_program)

def sums():
    # Random stuff
    d = lambda: random.randint(1,10)

    # Generate cases
    cases = []
    for _ in range(50):
        x = d()
        inp = [d() for _ in range(x)]
        cases.append({
            'inputs':[x, *inp],
            'expected':[sum(inp),[]]
        })

    for case in cases:
        case['expected'] = [str(e) for e in case['expected']]

    # Get input program
    print('Task 2: you are given a starting integer X, and X integers as input. Print the sum of the X integers.')
    user_program = ask()

    # Run cases
    return verify_cases(cases, user_program)

def sums_of_reals():
    # Random stuff
    n = lambda: random.randint(-20,20)
    d = lambda: random.randint(1,10)

    # Generate cases
    cases = []
    for _ in range(100):
        x = d()
        inp = [n() for _ in range(x)]
        cases.append({
            'inputs':[x, *inp],
            'expected':[sum(inp),[]]
        })

    for case in cases:
        case['expected'] = [str(e) for e in case['expected']]

    # Get input program
    print('Task 3: you are given a starting integer X, and X real numbers as input. Print the sum of the X real numbers.')
    user_program = ask()

    # Run cases
    return verify_cases(cases, user_program)

def palindrome():
    # Random stuff
    n = lambda: random.randint(1,5)
    s = lambda: random.randint(1,3)
    w = lambda: ''.join(random.choice(string.ascii_lowercase) for _ in range(n()))
    m = lambda: ''.join(random.choice(string.ascii_lowercase) for _ in range(s()))

    # Generate cases
    cases = []
    for _ in range(50):
        inp = w()
        cases.append({
            'inputs':[inp, len(inp)],
            'expected':[[inp==inp[::-1]]]
        })
    for _ in range(50):
        inp = m()
        inp = inp+inp[::-1]
        cases.append({
            'inputs':[inp, len(inp)],
            'expected':[[inp==inp[::-1]]]
        })

    for case in cases:
        case['expected'] = [str(e) for e in case['expected']]

    # Get input program
    print('Task 4: you are given a string as input and its length, return True if the string is a palindrome, False otherwise')
    user_program = ask()

    # Run cases
    return verify_cases(cases, user_program)

def pyramide_digit():
    # Random stuff
    d = lambda: random.randint(1,9)

    # Generate cases
    cases = []
    for _ in range(100):
        x = d()
        cases.append({
            'inputs':[x],
            'expected':[[[''.join([str(i) for i in range(n)]) for n in range(1,x+2)]]]
        })

    for case in cases:
        case['expected'] = [str(e) for e in case['expected']]

    # Get input program
    print('Task 5: you are given a starting integer X, return a pyramid made out of numbers from 0 to X')
    user_program = ask()

    # Run cases
    return verify_cases(cases, user_program)

def pyramide_stars():
    # Random stuff
    d = lambda: random.randint(2,9)

    # Generate cases
    cases = []
    for _ in range(100):
        x = d()
        cases.append({
            'inputs':[x],
            'expected':[*['*'*n for n in range(1,x+1)],[]]
        })

    for case in cases:
        case['expected'] = [str(e) for e in case['expected']]

    # Get input program
    print('Task 6: you are given a starting integer X, draw a pyramid made out of *')
    user_program = ask()

    # Run cases
    return verify_cases(cases, user_program)


chess_pattern = re.compile(r"((([♛♜](.{9} )*.{9})♔)|((♔(.{9} )*.{9})[♛♜])|(([♛♜]( {0,6}))♔)|((♔( {0,6}))[♛♜]))|((([♛♝].{10}( .{10})*)♔)|((♔.{10}( .{10})*)[♛♝])|(([♛♝].{8}( .{8})*)♔)|((♔.{8}( .{8})*)[♛♝]))")

def chess():
    # Random stuff
    d = lambda: random.randint(1,5)
    p = lambda: random.choice('♛♝♜')

    # Generate cases
    cases = []
    for _ in range(1_000):
        board = [[' ' for _ in range(8)] for _ in range(8)]
        for _ in range(d()):
            x = random.randint(0,7)
            y = random.randint(0,7)
            board[x][y] = p()
        kx = random.randint(0,7)
        ky = random.randint(0,7)
        board[kx][ky] = '♔'
        cases.append({
            'inputs':[''.join(row) for row in board],
            'expected':[[re.search(chess_pattern, ''.join([''.join(row)+'aa' for row in board])) is not None]]
        })

    for case in cases:
        case['expected'] = [str(e) for e in case['expected']]

    # Get input program
    print('Task 7: you are given a chess board in 8 lines of input, return True if the king is in check, False otherwise')
    user_program = ask()

    # Run cases
    return verify_cases(cases, user_program)



# --- Main ---

def run_challenge():
    print("RELANG: weird esolang that could have been Breton but it would have been too easy for AI :)")
    print("Let's see if you can write it!")
    print("<3 Let's run tests <3")

    print("Loading...")
    import time
    time.sleep(5)

    levels = [
        additions,
        sums,
        sums_of_reals,
        palindrome,
        pyramide_digit,
        pyramide_stars,
        chess,
    ]
    
    try:
        for level in levels:
            if not level():
                print(f"\n{separator}")
                exit()
    except:
        print(f"\n{separator}")
        exit()

    print(f"{separator}")
    
    print('Here is your well deserved flag:')
    print(r"BZHCTF{Plijout_a_ra_din_programmin_e_Es0l4n9!!!}")

if __name__ == "__main__":
    run_challenge()