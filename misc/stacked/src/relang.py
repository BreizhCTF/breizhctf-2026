## Special chars and tokens:
#   \n  - newline
#   \t  - Tab
#   \0  - null char
#   .   - any token in lang (default:[a-zA-Z0-9 ])
#   \s  - any white space
#   \S  - any non white space token in lang (default:[a-zA-Z0-9])
#   \d  - digit 0-9
#   \D  - non digit 0-9
#   \w  - word chat a-zA-Z
#   \W  - non word chat a-zA-Z
#   [a] - char in [...]
#   [a-z]   - char in the range in [...]
#   (a) - capturing group (pushed to the stack)
#   {3} - 3 match
#   {3,}- 3 or more match
#   {3,6}   - between 3 and 6 match
#   <0-99>  - 0 to 99 to int, left and right args are digit and output is a digit range 
#   ?   - 0 or 1 match
#   +   - 1 or more match
#   *   - 0 or more match
#   |   - or

## Operators
#   ;   - skip
#   +   - plus
#   -   - minus
#   *   - multiply
#   %   - divide
#   ^   - less than
#   =   - equal
#   §   - deploy (1 op)
#   &   - match (2 op)
#   _   - search (2 op)
#   ~   - replace (3 op)
#   °   - to int
#   "   - to string
#   |   - duplicate (2 op)
#   ¤   - get
#   $   - input
#   @   - map function ("1" op, gets more depending on given operator arity)
#   /   - reduce
#   ?   - filter
#   !   - print
#   :   - reverse
#   µ   - function from name

## Others
#   #   - comment



from enum import Enum
from functools import reduce
import re
from math import sin, cos, tan, sqrt, log, exp, floor, ceil

# Setup
class Parser(Enum):
    UNDEFINED = 0
    REGEX = 1 # Regex string
    OPERATOR = 2
    DIGIT = 3


class Regex():
    def __init__(self, regex):
        self.regex = regex
        self.is_infinite = '*' in regex or '+' in regex or '.' in regex
    
    def deploy(self):
        global lang
        if self.is_infinite: raise Exception("Can't unfold an infinite regex ! Remove infinite operators (*+.)")
        # Generate inverse regex :)
        def recur_gen(r, values, is_only_digit):
            global lang
            if not r: return values, is_only_digit
            c = r[0]
            if c == '[':
                if ']' not in r: raise Exception("Missing closing bracket !")
                i_closed_bracket = r.find(']')
                rb = r[0:i_closed_bracket+1]
                # Negation
                negated = rb[1] == '^'
                # Repetition with {}
                start_repetition, end_repetition, cb = 0, 1, None
                if len(r)>i_closed_bracket+1 and r[i_closed_bracket+1] == '{' and '}' in r[i_closed_bracket+1:]:
                    cb = r[i_closed_bracket+1:r.find('}')+1]
                    if ',' in cb:
                        start, end = cb.split(',')
                        start_repetition, end_repetition = int(start[1:]), int(end[:-1])
                    else:
                        end_repetition = int(cb[1:-1])
                        start_repetition = end_repetition
                if start_repetition > end_repetition: raise Exception(f"Invalid number of repetition {cb} !")
                if start_repetition<0 or end_repetition<0: raise Exception(f"Invalid number of repetition {cb} !")
                vals_temp = values.copy()
                prev_vals = []
                # Main loop
                for rep in range(0, end_repetition):
                    if rep==start_repetition-1:
                        prev_vals = vals_temp.copy()
                    if '-' not in rb: # Case [abcd]
                        new_vals = []
                        range_chars = rb[1:-1] if not negated else [_c for _c in lang if _c not in rb[2:-1]]
                        for rc in range_chars:
                            if vals_temp:
                                for v in vals_temp:
                                    new_vals.append(v+rc)
                            else:
                                new_vals.append(rc)
                        if rep == 0: vals_temp = new_vals
                        else: vals_temp += new_vals
                    else: # Case [a-z] and [a-zA-Z]
                        ranges = rb.count('-')
                        new_vals = []
                        stacked_ranges = []
                        for n in range(ranges):
                            start, end = rb[1+negated:-1][n*3:n*3+3].split('-')
                            _reversed = -1 if end<start else 1
                            range_chars = range(ord(start), ord(end)+_reversed, _reversed) if not negated else [ord(_c) for _c in lang if ord(_c) not in range(ord(start), ord(end)+_reversed, _reversed)]
                            if negated:
                                if stacked_ranges:
                                    intersection = set(stacked_ranges).intersection(range_chars)
                                    stacked_ranges = [_c for _c in stacked_ranges if _c in intersection]
                                else:
                                    stacked_ranges = range_chars
                            else:
                                stacked_ranges.extend(range_chars)
                        for i in stacked_ranges:
                            if vals_temp:
                                for v in vals_temp:
                                    new_vals.append(v+chr(i))
                            else:
                                new_vals.append(chr(i))
                        if rep == 0: vals_temp = new_vals
                        else: vals_temp += new_vals
                    if rep>=start_repetition-1:
                        values = vals_temp.copy()
                        for e in prev_vals:
                            if e in values:
                                values.remove(e)
                is_only_digit = False
                if cb is None:
                    return recur_gen(r[len(rb):], values, is_only_digit)
                else:
                    return recur_gen(r[len(rb)+len(cb):], values, is_only_digit)
            elif c == '<': # Digit range
                if '>' not in r: raise Exception("Missing closing arrow !")
                rb = r[0:r.find('>')+1]
                new_vals = []
                start, end = 0, 0
                if rb.count('-') == 1:
                    start, end = rb[1:-1].split('-')
                else:
                    if rb[1] == '-':
                        start = '-'+rb[1:-1].split('-')[1]
                    else:
                        start = rb[1:-1].split('-')[0]
                    if '--' in rb:
                        end = '-'+rb[1:-1].split('-')[-1]
                    else:
                        end = rb[1:-1].split('-')[-1]
                _reversed = -1 if int(end)<int(start) else 1
                for i in range(int(start), int(end)+_reversed, _reversed):
                    if values:
                        if i<0: is_only_digit = False
                        for v in values:
                            new_vals.append(v+str(i))
                    else:
                        new_vals.append(str(i))
                values = new_vals
                return recur_gen(r[len(rb):], values, is_only_digit)
            elif c == '(': # Capture group (there are arbitrary skipped for your pleasure)
                if ')' not in r: raise Exception("Missing closing parenthese !")
                rb = r[0:r.find(')')+1]
                return recur_gen(r[len(rb):], values, is_only_digit)
            elif c == '\\':
                c1 = r[1]
                if c1 == 'd':
                    return recur_gen('[0-9]'+r[2:], values, is_only_digit)
                elif c1 == 'w':
                    return recur_gen('[a-zA-Z]'+r[2:], values, is_only_digit)
                elif c1 == 's':
                    return recur_gen('[ \t\n]'+r[2:], values, is_only_digit)
                elif c1 == 'D':
                    return recur_gen('[^0-9]'+r[2:], values, is_only_digit)
                elif c1 == 'W':
                    return recur_gen('[^a-zA-Z]'+r[2:], values, is_only_digit)
                elif c1 == 'S':
                    return recur_gen('[^ \t\n]'+r[2:], values, is_only_digit)
                elif c1 == 'n':
                    return recur_gen('\n'+r[2:], values, is_only_digit)
                elif c1 == 't':
                    return recur_gen('\t'+r[2:], values, is_only_digit)
                elif c1 == '0':
                    return recur_gen('\0'+r[2:], values, is_only_digit)
                elif c1 == '\\':
                    return recur_gen('\\'+r[2:], values, is_only_digit)
                elif c1 == ' ':
                    return recur_gen(' '+r[2:], values, is_only_digit)
                else:
                    new_vals = []
                    if values:
                        for v in values:
                            new_vals.append(v+c1)
                    else:
                        new_vals = [c1]
                    values = new_vals
                    return recur_gen(r[2:], values, is_only_digit)
            elif c=='?': # ? = 0 or 1, so [...]? changes nothing to the deploy op output
                return recur_gen(r[1:], values, is_only_digit)
            elif c=='|':
                if values:
                    new_vals = []
                    right_char = r[1]
                    for v in values:
                        new_vals.append(v)
                        if v[-1] != right_char:
                            new_vals.append(v[:-1]+right_char)
                    if right_char not in '0123456789': is_only_digit = False
                    values = new_vals
                    return recur_gen(r[2:], values, is_only_digit)
                else:
                    raise Exception("No character before |")
            else:
                if values:
                    values = [v+c for v in values]
                else:
                    values.append(c)
                if c not in '0123456789': is_only_digit = False
                return recur_gen(r[1:], values, is_only_digit)
        values, is_only_digit = recur_gen(self.regex, [], True)
        if is_only_digit:
            values = [int(v) for v in values]
        else:
            values = [Regex(v) for v in values]
        return values

    def __str__(self):
        return self.regex
    def __repr__(self):
        return f"'{self.regex}'"
    def __add__(self, other):
        if isinstance(other, Regex):
            return Regex(self.regex + other.regex)
        try:
            return Regex(self.regex + other)
        except:
            return Regex(self.regex + str(other))
    def __radd__(self, other):
        if isinstance(other, Regex):
            return Regex(other.regex + self.regex)
        try:
            return Regex(str(other) + self.regex)
        except:
            return Regex(other + self.regex)
    def __mul__(self, other):
        return Regex(self.regex * other)
    def __rmul__(self, other):
        return Regex(other * self.regex)
    def __eq__(self, other):
        return self.regex == other.regex
    def __ne__(self, other):
        return self.regex != other.regex
    def __int__(self):
        return int(self.regex)
    def __float__(self):
        return float(self.regex)
    def __bool__(self):
        return bool(self.regex)
    def __len__(self):
        return len(self.regex)
    def __getitem__(self, key):
        return self.regex[key]
    def __contains__(self, item):
        return item in self.regex
    def __iter__(self):
        return iter(self.regex)

class Operator():
    def __init__(self, op):
        self.op = op
        self.arity = 2 if op in ['+', '-', '*', '/', '%', '^', '=', '|', '¤'] else 1 if op in ['§', '°', '"', ':', '!', 'µ'] else 3 if op in ['~', '?'] else 1
        self.function = None # To implement for map and reduce
        match op:
            case '+':
                self.function = lambda a,b: a+b
            case '-':
                self.function = lambda a,b: a-b
            case '*':
                self.function = lambda a,b: a*b
            case '%':
                self.function = lambda a,b: a/b
            case '^':
                self.function = lambda a,b: a<b
            case '=':
                self.function = lambda a,b: a==b
            case ';':
                self.function = lambda x: x
            case '§':
                self.function = lambda x: x.deploy() if isinstance(x, Regex) else x
            case '&':
                self.function = lambda a,b: re.match(str(a), str(b)) is not None
            case '_':
                self.function = lambda a,b: re.search(str(a), str(b)) is not None
            case '~':
                self.function = lambda a,b,c: Regex(re.sub(str(a), str(b), str(c)))
            case '°':
                self.function = lambda x: int(x)
            case '"':
                self.function = lambda x: str(x)
            case '|':
                self.function = lambda a,b: [b for _ in range(a)]
            case '$':
                self.function = lambda: input()
            case ':':
                self.function = lambda x: x[::-1]
            case '?':
                self.function = lambda f, a: [x for x in a if f(x)]
            case '/':
                self.function = lambda f, a: reduce(f, a)
            case '!':
                self.function = lambda x: (x, print(x))[0]
            case '¤':
                def getting(ind,arr):
                    global can_getattr
                    _get = lambda a,i: a[i] if (hasattr(arr, '__getitem__') or can_getattr==False) else getattr(arr, str(i))
                    return [_get(arr, _i) for _i in ind] if isinstance(ind, list) else _get(arr, ind)
                self.function = getting
            case 'µ':
                global func_globals
                #self.function = lambda name: Operator(getattr(__builtins__, name) if name in dir(__builtins__) else globals().get(name, lambda *a: None))
                self.function = lambda name: Operator(func_globals.get(name, lambda *a: None))
            case _:
                self.function = self.op # Case for functions from name (µ)
    def __str__(self):
        return self.op
    def __repr__(self):
        return f"Op({self.op})"
    def __call__(self, *args, **kwds):
        if self.function is None:
            raise NotImplementedError(f"Operator {self.op} not implemented yet for reduce and map !")
        return self.function(*args, **kwds)



def Interpreter(text, can_getattr=False):
    operators = ['+', '-', '*', '/', '%', '^', '§', '&', '_', '~', '¤', ';', '°', '"', '|', '$', '#', '=', ':', '?', '!', '@', 'µ']

    ## Add extra functions to globals for µ operator
    extra_functions = ['abs', 'all', 'any', 'bin', 'bool', 'bytearray', 'bytes', 'chr', 'complex', 'dict', 'dir', 'enumerate', 'filter', 'float', 'hash', 'hex', 'int', 'len', 'list', 'map', 'max', 'min', 'oct', 'ord', 'pow', 'range', 'reversed', 'round', 'set', 'sorted', 'str', 'sum', 'tuple', 'type', 'vars', 'zip']
    func_globals = {f: __builtins__[f] for f in extra_functions}
    func_globals.update({f: globals()[f] for f in ["sin", "cos", "tan", "sqrt", "log", "exp", "floor", "ceil", "Operator", "Regex"]})
    globals().update({'can_getattr': can_getattr})

    # Parsing
    if not text.endswith(' '): text = text + r' ' # Force parsing at the end
    stack = []
    token = ""
    state = Parser.UNDEFINED
    pointer = 0
    while pointer < len(text):
        c = text[pointer]
        
        if c == '\\': # Backslash
            c+=text[pointer+1]
            pointer+=1
        elif c == ' ' and token: # End of token
            match state:
                case Parser.REGEX:
                    stack.append(Regex(token))
                case Parser.OPERATOR:
                    stack.append(Operator(token))
                case Parser.DIGIT:
                    stack.append(int(token))
                case _:
                    pass
            token = ""
            state = Parser.UNDEFINED

        if c in operators and state == Parser.UNDEFINED:
            state = Parser.OPERATOR
        elif c in '0123456789' and (state == Parser.UNDEFINED or state == Parser.DIGIT):
            state = Parser.DIGIT
        elif c != ' ':
            state = Parser.REGEX
        else:
            state = Parser.UNDEFINED

        #char = c.encode()
        token += c if c != ' ' else '' # Add char but don't fill with useless whitespace
        pointer += 1

    ## Comments
    for i in range(len(stack)-1, -1, -1):
        if isinstance(stack[i], Operator) and stack[i].op == '#':
            stack = stack[:i]
            break

    # Eval
    global lang
    lang = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    pointer = 0
    stack = stack[::-1]
    while pointer < len(stack):
        # Future token is a special operator then skip the current one
        if pointer+1 < len(stack) and isinstance(stack[pointer+1], Operator) and stack[pointer+1].op in ['/', '?', '@'] and stack[pointer].op not in  ['@', ';', 'µ']:
            pointer += 1
            continue
        # Continue normally
        item = stack.pop(pointer)
        if isinstance(item, Regex):
            stack.insert(pointer, item)
        elif isinstance(item, int):
            stack.insert(pointer, item)
        elif isinstance(item, Operator):
            op = item.op
            match op:
                case '§': # Deploy
                    r = stack.pop(pointer-1)
                    dep = r.deploy()
                    stack.insert(pointer-1, dep)
                    pointer -= 1
                # Basic ops
                case '+':
                    left, right = stack.pop(pointer-1), stack.pop(pointer-2)
                    stack.insert(pointer-2, left+right)
                    pointer -= 2
                case '-':
                    left, right = stack.pop(pointer-1), stack.pop(pointer-2)
                    stack.insert(pointer-2, left-right)
                    pointer -= 2
                case '*':
                    left, right = stack.pop(pointer-1), stack.pop(pointer-2)
                    stack.insert(pointer-2, left*right)
                    pointer -= 2
                case '%':
                    left, right = stack.pop(pointer-1), stack.pop(pointer-2)
                    stack.insert(pointer-2, left/right)
                    pointer -= 2
                case '^':
                    left, right = stack.pop(pointer-1), stack.pop(pointer-2)
                    stack.insert(pointer-2, left<right)
                    pointer -= 2
                case '=':
                    left, right = stack.pop(pointer-1), stack.pop(pointer-2)
                    stack.insert(pointer-2, left==right)
                    pointer -= 2
                # More special ops
                case '#': # Comments
                    stack = stack[pointer:]
                    pointer = -1
                case '&': # Match
                    left, right = stack.pop(pointer-1), stack.pop(pointer-2)
                    if isinstance(right, Regex):
                        right = str(right).replace(r'\ ', ' ').replace(r'\t', '\t').replace(r'\n', '\n')
                    if isinstance(right, list):
                        if isinstance(left, list):
                            resp = []
                            for l,r in zip(left, right):
                                resp.append(re.match(str(l), str(r)) is not None)
                            stack.insert(pointer-2, resp)
                            pointer -= 2
                        else:
                            left = str(left)
                            resp = []
                            for r in right:
                                resp.append(re.match(left, str(r)) is not None)
                            stack.insert(pointer-2, resp)
                            pointer -= 2
                    else:
                        left, right = str(left), str(right)
                        stack.insert(pointer-2, re.match(left, right) is not None)
                        pointer -= 2
                case '_': # Search
                    left, right = stack.pop(pointer-1), stack.pop(pointer-2)
                    if isinstance(right, Regex):
                        right = str(right).replace(r'\ ', ' ').replace(r'\t', '\t').replace(r'\n', '\n')
                    if isinstance(right, list):
                        if isinstance(left, list):
                            resp = []
                            for l,r in zip(left, right):
                                resp.append(re.search(str(l), str(r)) is not None)
                            stack.insert(pointer-2, resp)
                            pointer -= 2
                        else:
                            left = str(left)
                            resp = []
                            for r in right:
                                resp.append(re.search(left, str(r)) is not None)
                            stack.insert(pointer-2, resp)
                            pointer -= 2
                    else:
                        left, right = str(left), str(right)
                        stack.insert(pointer-2, re.search(left, right) is not None)
                        pointer -= 2
                case '~': # Replace
                    left, replacement, right = stack.pop(pointer-1), stack.pop(pointer-2), stack.pop(pointer-3)
                    if isinstance(right, Regex):
                        right = str(right).replace(r'\ ', ' ').replace(r'\t', '\t').replace(r'\n', '\n')
                    if isinstance(right, list):
                        if isinstance(left, list):
                            resp = []
                            for l,r in zip(left, right):
                                resp.append(re.sub(str(l), str(replacement), str(r)))
                            resp = [Regex(r) for r in resp]
                            stack.insert(pointer-3, resp)
                            pointer -= 3
                        else:
                            left = str(left)
                            resp = []
                            for r in right:
                                resp.append(re.sub(left, str(replacement), str(r)))
                            resp = [Regex(r) for r in resp]
                            stack.insert(pointer-3, resp)
                            pointer -= 3
                    else:
                        left, right = str(left), str(right)
                        stack.insert(pointer-3, Regex(re.sub(left, str(replacement), right)))
                        pointer -= 3
                case '$': # Input
                    stack.insert(pointer, Regex(input()))
                    pointer -= 1
                case ';': # Skip
                    pointer -= 1
                case '°': # to int
                    stack[pointer-1] = int(stack[pointer-1])
                    pointer -= 1
                case '"': # to string
                    stack[pointer-1] = str(stack[pointer-1])
                    pointer -= 1
                case ':': # reverse
                    stack[pointer-1] = stack[pointer-1][::-1]
                    pointer -= 1
                case '!': # print
                    e = stack.pop(pointer-1)
                    print(e)
                    pointer -= 2
                case '|': # duplicate
                    left, right = stack.pop(pointer-1), stack.pop(pointer-2)
                    if not isinstance(left, int): raise Exception("Left operand of duplicate operator must be an integer !")
                    stack.insert(pointer-2, [right for _ in range(left)])
                    pointer -= 2
                case '/': # reduce
                    left, right = stack.pop(pointer-1), stack.pop(pointer-2)
                    if isinstance(right, list):
                        stack.insert(pointer-2, reduce(left, right))
                        pointer -= 2
                    else:
                        raise NotImplementedError("Right operand of reduce must be a list !")
                case '?': # filter
                    operator = stack.pop(pointer-1)
                    if not isinstance(operator, Operator): raise Exception("Left operand of map operator must be an operator !")
                    arity = operator.arity
                    args = [stack.pop(pointer-2-ar) for ar in range(arity)]
                    last_element = args.pop(-1) # Will be the one filtered
                    if '__iter__' not in dir(last_element): last_element = [last_element]
                    output = [le for le in last_element if operator(*args, le)]
                    stack.insert(pointer-arity-1, output)
                    pointer -= arity+1
                case '@': # map
                    operator = stack.pop(pointer-1)
                    if not isinstance(operator, Operator): raise Exception("Left operand of map operator must be an operator !")
                    arity = operator.arity
                    args = [stack.pop(pointer-2-ar) for ar in range(arity)]
                    last_element = args.pop(-1) # Will be the one mapped on
                    if '__iter__' not in dir(last_element): last_element = [last_element]
                    output = [operator(*args, le) for le in last_element]
                    stack.insert(pointer-arity-1, output)
                    pointer -= arity+1
                case '¤': # get
                    left, right = stack.pop(pointer-1), stack.pop(pointer-2)
                    getting = lambda a,i: a[i] if (hasattr(right, '__getitem__') or can_getattr==False) else getattr(right, str(i))
                    if isinstance(left, list):
                        stack.insert(pointer-2, [getting(right, i) for i in left])
                    else:
                        stack.insert(pointer-2, getting(right, left))
                    pointer -= 2
                case 'µ': # function from name
                    name = str(stack[pointer-1])
                    #stack[pointer-1] = Operator(getattr(__builtins__, name) if name in dir(__builtins__) else globals().get(name, lambda *a: None))
                    stack[pointer-1] = Operator(func_globals.get(name, lambda *a: None))
                    pointer -= 1
        else:
            pass
        pointer += 1

    stack = stack[::-1]
    print(stack)



if __name__ == "__main__":
    Interpreter(r"? = hello § he[^A-Z0-9]lo")