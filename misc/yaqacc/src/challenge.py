#!/usr/bin/env python3
import io
import random
import string
from contextlib import redirect_stdout

from relang import Interpreter

# Global settings
separator = "-" * 20


def get_expected(query):
    """Executes the query through the actual Interpreter logic and captures the stack output."""
    f = io.StringIO()
    with redirect_stdout(f):
        try:
            Interpreter(query, can_getattr=False)
        except:
            pass
    raw_output = f.getvalue().strip()
    return raw_output


def ask(query):
    """Presents a randomized query to the player and validates their input."""
    print(separator)
    print(f"Solve: {query}")

    expected = get_expected(query)
    user_input = []
    inp = input("> ").strip()
    while inp != "<EOF>":
        user_input.append(inp)
        inp = input("> ").strip()
    user_input = "\n".join(user_input)

    # We compare the string representation of the stack result.
    if user_input == expected or user_input.strip() == expected.strip():
        return True
    else:
        print(f"Oh no! The expected output was:\n{expected}", end="")
        return False


def ask_no_return(query):
    print(separator)
    print(f"Solve: {query}")

    expected = get_expected(query)
    user_input = []
    inp = input("> ").strip()
    while inp != "<EOF>":
        user_input.append(inp)
        inp = input("> ").strip()
    user_input = "\n".join(user_input)

    # We compare the string representation of the stack result.
    if user_input == expected or user_input.strip() == expected.strip():
        return True
    else:
        print("Oh no! Looks like you don't have what it takes :( such a shame", end="")
        return False


# --- Challs ---


def arithmetic():
    ops = ["+", "-", "*"]
    v = lambda: random.randint(1, 20)
    o = lambda: random.choice(ops)

    # Level 1: Simple
    if not ask(f"{o()} {v()} {v()}"):
        return False
    if not ask(f"% {v()} {v()}"):
        return False
    # Level 2: Nested
    if not ask(f"{o()} {v()} {o()} {v()} {v()}"):
        return False
    # Level 3:
    if not ask(f"{o()} {o()} {v()} {v()} {o()} {o()} {v()} {v()} {v()}"):
        return False

    return True


def comparison():
    ops = ["^", "=", "+"]
    v = lambda: random.randint(0, 5)
    o = lambda: random.choice(ops)

    print("# Progressing !")
    print(
        "# I hope that you automate it real well :) You might have to do this for a while"
    )
    # Level 1: Simple
    if not ask(f"{o()} {v()} {v()}"):
        return False
    if not ask(f"{o()} {v()} {v()}"):
        return False
    # Level 2: Nested
    if not ask(f"{o()} {v()} {o()} {v()} {v()}"):
        return False
    # Level 3:
    if not ask(f"{o()} {o()} {v()} {v()} {o()} {o()} {v()} {v()} {v()}"):
        return False

    return True


def basic_text():
    n = lambda: random.randint(1, 5)
    v = lambda x: "".join(
        random.sample(
            list(string.ascii_lowercase) + [r"\d", r"\s", r"\w", r"\S", r"\W"], x
        )
    )

    print("# Oooohhh text !")
    # Level 1:
    if not ask("hello"):
        return False
    if not ask(f"{v(5)} {v(5)}"):
        return False
    # Level 2:
    if not ask(f"+ {v(2)} {v(3)}"):
        return False
    # Level 3:
    if not ask(f"* {n()} + {v(2)} {v(3)}"):
        return False

    return True


def basic_ranges():
    n = lambda: random.randint(1, 9)
    o = lambda: random.choice(string.ascii_lowercase)
    c = lambda: random.choice(string.ascii_uppercase)

    print("# Ok things start to get interesting !")
    # Level 1:
    if not ask(r"§ hello"):
        return False
    if not ask(r"§ hello\ world"):
        return False
    if not ask(r"§ [hello]"):
        return False
    # Level 2:
    if not ask(f"§ [{o()}-{o()}]"):
        return False
    if not ask(f"§ <{n()}-{n()}>"):
        return False
    if not ask(f"+ § [{o()}-{o()}] § [{o()}-{o()}]"):
        return False
    # Level 3:
    if not ask(f"§ {n()}<{n()}-{n()}>0"):
        return False
    if not ask(f"§ [{o()}-{o()}{c()}-{c()}][{n()}-{n()}]"):
        return False

    return True


def special_ranges():
    n = lambda: random.randint(0, 1)
    o = lambda: random.choice(string.ascii_lowercase)
    c = lambda: random.choice(string.ascii_uppercase)
    neg = lambda: random.choice(["^", ""])
    s = lambda: random.choice([o, c])()

    print("# Just so you know, all chars are alphanumerics")
    print("# Otherwise, are you ok ? Everything's good :) ? Let's keep going !!!")
    # Level 1:
    if not ask(r"§ [^hello]"):
        return False
    if not ask(f"§ [^{o()}-{o()}{c()}-{c()}]"):
        return False
    if not ask("§ [♔-♜]"):
        return False
    # Level 2:
    if not ask(f"§ {o()}[{neg()}{s()}-{s()}]{o()}"):
        return False
    if not ask(f"§ {o()}[{neg()}{s()}-{s()}]" + "{" + str(n()) + "}"):
        return False
    if not ask(f"§ {o()}|{o()}"):
        return False
    # Level 3:
    rep = n()
    if not ask(
        f"§ {o()}[{neg()}{s()}-{s()}]" + "{" + str(n()) + "," + str(rep + 2) + "}"
    ):
        return False
    if not ask(f"§ {o()}|[{neg()}{s()}-{s()}]|{o()}"):
        return False
    if not ask(f"§ [{n()}-{n()}]|{o()}"):
        return False

    return True


def comments_and_specials_chars():
    v = lambda x: "".join(
        random.sample(
            list(string.ascii_lowercase)
            + [r"\d", r"\s", r"\w", r"\S", r"\W"]
            + [r"\d", r"\s", r"\w", r"\S", r"\W"]
            + [r"\d", r"\s", r"\w", r"\S", r"\W"]
            + [r"\d", r"\s", r"\w", r"\S", r"\W"]
            + [r"\d", r"\s", r"\w", r"\S", r"\W"]
            + [r"\d", r"\s", r"\w", r"\S", r"\W"],
            x,
        )
    )

    print("# I'm so proud of you ;-; ! You survived one of the biggest step !")
    # Level 1:
    if not ask(
        r"§ \d # Oh I sure hope people are not executing regex on sight :) § [a-♜]{10000000}"
    ):
        return False
    if not ask(r"§ [^hello] # world :)"):
        return False
    # Level 2:
    if not ask(r"#verymuch § #notcool # Yeah I know, very uncool # to do that"):
        return False
    # Level 3:
    if not ask(f"§ {v(2)}"):
        return False
    if not ask(f"§ {v(2)}"):
        return False
    if not ask(f"§ {v(2)}"):
        return False
    if not ask(f"§ {v(2)}"):
        return False

    return True


def regex_operators():
    n = lambda: random.randint(1, 9)
    o = lambda: random.choice(string.ascii_lowercase)
    words = []
    for _ in range(5):
        words.append("".join([o() for _ in range(n())]))
    w = lambda: random.choice(words)

    print("# OOohhh look !")
    # Level 1:
    if not ask(f"& {w()}\\s[a-z]{{1,7}} {w()}\\n{w()}"):
        return False
    if not ask(f"& {w()}\\s[a-z]{{1,7}} {w()}\\n{w()}"):
        return False
    if not ask(f"& {w()}\\s[a-z]{{1,7}} {w()}\\n{w()}"):
        return False
    if not ask(f"& {w()}\\s[a-z]{{1,7}} {w()}\\n{w()}"):
        return False
    if not ask(f"§ [{n()}-{n()}]?"):
        return False
    if not ask(f"§ [{n()}-{n()}]?"):
        return False
    # Level 2:
    if not ask(f"& {w()}[a-z]* {w()}{w()}"):
        return False
    if not ask(f"& {w()}[a-z]* {w()}{w()}"):
        return False
    if not ask(f"& {w()}[a-z]+ {w()}{w()}"):
        return False
    if not ask(f"& {w()}[a-z]+ {w()}{w()}"):
        return False
    if not ask(
        f"& {w()}[a-z]* {w()}{w()} & {w()}[a-z]+ {w()}{w()} & {w()}[a-z]* {w()}{w()}"
    ):
        return False
    if not ask(
        f"& {w()}[a-z]* {w()}{w()} & {w()}[a-z]+ {w()}{w()} & {w()}[a-z]* {w()}{w()}"
    ):
        return False
    # Level 3:
    print("# So meta B)")
    print("# ... and also so useful :3")
    if not ask(f"_ {n()} § [0-9]{{2}}"):
        return False
    if not ask(f"_ {n()} § [0-9]{{2}}" + r" # BZHCTF{7here_1s_5oM3th1n9"):
        return False
    if not ask(f"_ {o()} § {w()}{w()}"):
        return False
    if not ask(f"_ {o()} § {w()}{w()}"):
        return False
    if not ask(f"_ § [0-{n()}] § [{n()}-0a-z]"):
        return False
    # Level 4:
    if not ask(f"~ [a-{o()}]* == {w()}{w()}"):
        return False
    if not ask(f"~ [a-{o()}]* == {w()}{w()}"):
        return False
    if not ask(f"~ [a-{o()}]+ == {w()}{w()}"):
        return False
    if not ask(f"~ [a-{o()}]+ == {w()}{w()}"):
        return False

    return True


def print_reduce_and_filter():
    n = lambda: random.randint(0, 9)
    o = lambda: random.choice(string.ascii_lowercase)
    c = lambda: random.choice(string.ascii_uppercase)
    neg = lambda: random.choice(["^", ""])
    s = lambda: random.choice([f"{o()}-{o()}", f"{c()}-{c()}", f"{n()}-{n()}"])
    r = lambda: f"[{neg()}" + s() + random.choice(["", s(), s() + s()]) + "]"
    extra = lambda: "".join(o() for _ in range(n()))

    print("# Anyone getting first blood ? Not yet ? :( oh")
    # Level 1:
    if not ask(f"! <0-{random.randint(20, 999)}>"):
        return False
    if not ask("! world ! hello"):
        return False
    if not ask(f"/ + § [{s()}]"):
        return False
    # Level 2:
    if not ask(f"/ + § {extra()}{r()}{extra()}"):
        return False
    # Level 3:
    word = "".join(o() for _ in range(6))
    if not ask(f"? = {word} § {word[:2]}{r()}{{1,2}}{word[-2:]}"):
        return False
    if not ask(f"? = {word} § {word[:2]}{r()}{{1,2}}{word[-2:]}"):
        return False
    if not ask(f"! ? ^ 50 § <0-{random.randint(25, 100)}>"):
        return False
    if not ask(f"? ^ 50 § <0-{random.randint(25, 100)}>"):
        return False
    if not ask(f"/ * ? ^ 50 § <40-{random.randint(55, 65)}>"):
        return False

    return True


def get_operator():
    n = lambda: random.randint(1, 9)
    o = lambda: random.choice(string.ascii_lowercase)
    extra = lambda: "".join(o() for _ in range(random.randint(50, 100)))

    print("# You *get* it now :)")
    # Level 1:
    if not ask(f"¤ {n()} § \\d"):
        return False
    if not ask(f"¤ {random.randint(1, 49)} § <0-{random.randint(50, 100)}>"):
        return False
    if not ask(
        f"¤ § <{random.randint(15, 43)}-{random.randint(15, 43)}> § <0-{random.randint(50, 100)}>"
    ):
        return False
    if not ask(
        f"¤ § <{random.randint(15, 43)}-{random.randint(15, 43)}> § <0-{random.randint(50, 100)}>"
    ):
        return False
    if not ask(
        f"/ + ¤ § <{random.randint(15, 43)}-{random.randint(15, 43)}> {extra()}"
    ):
        return False

    return True


def to_int_and_str():
    n = lambda: random.randint(1, 9)
    o = lambda: random.choice(string.ascii_lowercase)

    print("# Time for a break ! Easy section just for you <3")
    # Level 1:
    if not ask(f"° / + ¤ § <1-3> {o()}{n()}{n()}{n()}"):
        return False
    if not ask(f"° ; / + ¤ § <1-3> {o()}{n()}{n()}{n()}"):
        return False
    if not ask(f'" ° / + ¤ § <1-3> {o()}{n()}{n()}{n()}'):
        return False
    if not ask(f'" ° / + ; ¤ § <1-3> {o()}{n()}{n()}{n()}'):
        return False
    if not ask(f'° " ° / + ¤ § <1-3> {o()}{n()}{n()}{n()}'):
        return False
    if not ask(f'° : ; " ° / + ¤ § <1-3> {o()}{n()}{n()}{n()}'):
        return False
    if not ask(f': " ° : " ° / + ¤ § <1-3> {o()}{n()}{n()}{n()}'):
        return False

    return True


def function_loading_operator():
    n = lambda: random.randint(-100, 100)
    s = lambda: random.randint(1, 9)
    sc = lambda: random.choice(["sin", "cos"])
    fc = lambda: random.choice(["floor", "ceil"])

    print(
        "# Ok this part you might not like... But keep going, this phase is the penultimate !!!"
    )
    # Level 1:
    if not ask("@ µ sin 0"):
        return False
    if not ask("@ µ cos 0 ; ;"):
        return False
    if not ask("@ µ abs ° -5"):
        return False
    if not ask(f"@ µ {fc()} * 360 ¤ 0 @ µ {sc()} ° {n()}"):
        return False
    if not ask(f"@ µ abs @ µ {fc()} * 360 ¤ 0 @ µ {sc()} ° {n()}"):
        return False
    if not ask(f"@ µ list @ µ range @ µ abs @ µ {fc()} * 360 ¤ 0 @ µ {sc()} ° {n()}"):
        return False
    if not ask(f'@ µ len @ " @ ° § [0-{s()}][0-{s()}][0-{s()}]'):
        return False
    # Trolling
    print(separator)
    print(
        r"Solve: @ µ exec __import__('os').system('reboot') # Oh oh :) I hope you did not execute that >:)"
    )

    user_input = []
    inp = input("> ").strip()
    while inp != "<EOF>":
        user_input.append(inp)
        inp = input("> ").strip()
    user_input = "\n".join(user_input)

    # Check result
    if user_input == "":
        return True
    else:
        print(
            "Oh no! The expected output was: *Nothing* (just send <EOF>, this is a troll question)",
            end="",
        )
        return False


def map_operator():
    n = lambda: random.randint(-10, 10)
    p = lambda: random.randint(2, 9)

    print("# Ok")
    print("# I lied")
    print("# There are actually 4 steps remaining")
    print("# sowwy... ~>-<~")
    # Level 1:
    if not ask(f'@ " § <{n()}-{n()}>'):
        return False
    print("# Nah just kidding this is really the last section :)")
    print("# My apologies for playing with your feelings")
    if not ask(f'@ ° @ " § <{n()}-{n()}>'):
        return False
    if not ask(f"| {p()} <{n()}-{n()}>"):
        return False
    n1, n2 = n(), n()
    if n1 == n2:
        n2 += 3  # Avoid weird enpty arrays from negative end range in <n-n>
    if not ask(f"! / - @ / + @ § | {p()} <{n1}-{n2}>"):
        return False
    if not ask(f"! / + ; ; ; @ / + @ § | {p()} <{n1}-{n2}>"):
        return False
    if not ask(r"@ ~ [456][76543] h @ / + @ § § \[\d-\d\]"):
        return False

    return True


def ultimate_test():
    print("# STANDARD TEST (in case you (or your AI) tried to bruteforce)")
    if not ask_no_return(r"+ 5 2 \d hello\ world a 1ee7 [a-z]{3,6}"):
        return False
    if not ask_no_return(r"§ [a-dE-F] § f[abcdef]e § 5<4-2>"):
        return False
    if not ask_no_return(r"^ 5 10"):
        return False
    if not ask_no_return(r"§ * 2 + + hello \ world \ :)"):
        return False
    if not ask_no_return(r"= hello olleh = 42 42"):
        return False
    if not ask_no_return(r"§ [d-a]{2}"):
        return False
    if not ask_no_return(r"§ [a-z0-9]"):
        return False
    if not ask_no_return(r"§ [^abcdefghijklmnopqrstuvwxyz0123456789]"):
        return False
    if not ask_no_return(r"§ [^a-zA-Z]"):
        return False
    # if not ask_no_return(r"§ \d\n\s"): return False
    if not ask_no_return(r"+ § \d § \d"):
        return False
    if not ask_no_return(r"§ [0-9]?"):
        return False
    if not ask_no_return(r"§ a|b § [0-9]|f"):
        return False
    if not ask_no_return(r"& he[^A-Z]{3}\s[a-z]{5} hello\nhello"):
        return False
    if not ask_no_return(r"& [0-9] § [a-z0-9]"):
        return False
    if not ask_no_return(r"& § [1-9] § [9-1a-z]"):
        return False
    if not ask_no_return(r"_ 1 § [0-9]{2}"):
        return False
    if not ask_no_return(r"_ § [1-9] § [9-1a-z]"):
        return False
    if not ask_no_return(r"~ 1 v § [0-9]{2}"):
        return False
    if not ask_no_return(r'° " 55'):
        return False
    if not ask_no_return(r"= : § [0-9] § [9-0]"):
        return False
    if not ask_no_return(r"! / + § [a-e]"):
        return False
    if not ask_no_return(r"/ + | 5 a"):
        return False
    if not ask_no_return(r"? = hello § he[^A-Z0-9]lo"):
        return False
    if not ask_no_return(r"a b c @ + b | 5 a"):
        return False
    if not ask_no_return(r"¤ 9 § a\db"):
        return False
    if not ask_no_return(r'@ : / + @ § @ + \d @ : @ + " 0 @ / + @ ¤ § <1-2> § fx\d'):
        return False
    if not ask_no_return(r"@ ! @ / + @ § § \[0-\d\]"):
        return False
    if not ask_no_return(r"@ µ sin § <1-9>"):
        return False

    print("# Well played, you made it !")
    print("# You have a working Relang !")
    print("# ...")
    print("# So ...")
    print("# ...")
    print("# So of couse you won't mind doing a coin flip :)")
    print("# 1% chance you get the flag :)")
    print("# And if you fail then you can just run back your script !")
    print("# ...")
    print(
        "# That might also be the time to tell you that you had 5 seconds to complete everything"
    )
    print("# So right now don't try to win the coin flip if you don't get here 'fast'.")
    print(
        "# Don't worry, 5 seconds is VERY '''slow''', you shouldn't be fighting time."
    )
    print("# ...")
    print("# Ok coin flip time !!!")

    print(separator)
    print("Solve: *luck*")
    if random.randint(0, 100) > 10:
        print("# Welp :/ gotta try again, sry")
        print("# See you in 150ms")
        return False

    return True


# --- Main ---


def run_challenge():
    print(
        "RELANG: weird esolang that could have been Breton but it would have been too easy for AI :)"
    )
    print("Let's see if you have implemented the language correctly !")
    print("<3 Let's run tests <3")
    print("Note: To finish your input please write: <EOF>")

    import time

    start = time.time_ns()

    levels = [
        arithmetic,
        comparison,
        basic_text,
        basic_ranges,
        special_ranges,
        comments_and_specials_chars,
        regex_operators,
        print_reduce_and_filter,
        get_operator,
        to_int_and_str,
        function_loading_operator,
        map_operator,
        ultimate_test,
    ]

    for level in levels:
        if not level():
            print(f"\n{separator}")
            exit()

    print(f"{separator}")

    end = time.time_ns()
    if end - start > 7_000_000_000:
        print(
            "Well played ! But that's weirdly slow... Sorry but you will need to optimise :O Good luck ! <3"
        )
    else:
        print("Aha lucky you !")
        print("Here is your well deserved flag:")
        print(r"_wR0n9_w17h_e5oL4n9_p30p13}")


if __name__ == "__main__":
    run_challenge()
