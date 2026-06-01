project(
  'emulated-trust',
  'c',
  version: '1.0.0',
  default_options: [
    'c_std=c23',
    'buildtype=plain',
    'optimization=1',
  ],
)

seed = '13371337'

strip = find_program('strip')
objcopy = find_program('objcopy')
cc = find_program('cc')
sh = find_program('sh')

decode_obfuscated = custom_target(
  'decode_obfuscated',
  input: ['decode.c', 'decode.h'],
  output: 'decode_obfuscated.o',
  command: [
    sh,
    '-c', 'tmpdir=$(mktemp -d) && trap "rm -rf \"$tmpdir\"" EXIT && '
    + 'export TIGRESS_HOME=/opt/tigress/tigress/4.0.11 && '
    + 'export PATH="$TIGRESS_HOME:$PATH" && '
    + 'tigress_bin="$TIGRESS_HOME/tigress" && '
    + 'tigress_header=/opt/tigress/tigress/4.0.11/tigress.h && '
    + 'cp ../decode.h "$tmpdir/decode.h" && '
    + 'printf "int main(void){return 0;}\012" > "$tmpdir/decode_input.c" && '
    + 'cat "$tigress_header" "$2" >> "$tmpdir/decode_input.c" && '
    + '"$tigress_bin" '
    + '--Seed='
    + seed
    + ' '
    + '--gcc=gcc -std=c99 '
    + '--Environment=x86_64:Linux:Gcc:13.0 '
    + '--Transform=Virtualize --Functions=bs_decode_character '
    + '--VirtualizeDispatch=direct '
    + '--VirtualizePerformance=PointerStack '
    + '--VirtualizeOptimizeBody=true '
    + '--VirtualizeOptimizeTreeCode=true '
    + '--VirtualizeOperands=stack '
    + '--VirtualizeSuperOpsRatio=0.2 '
    + '--VirtualizeMaxMergeLength=3 '
    + '--VirtualizeInstructionHandlerSplitCount=0 '
    + '--Transform=CleanUp --CleanUpKinds=annotations '
    + '--out="$tmpdir/decode_tigress.c" "$tmpdir/decode_input.c" && '
    + '"$1" -O2 -I"$tmpdir" -c "$tmpdir/decode_tigress.c" -o "$3" && '
    + 'python3 -c "import pathlib,re,sys; src=pathlib.Path(sys.argv[1]).read_text(); vals=bytes(int(x,16) for x in re.findall(r\'0x([0-9a-fA-F]{2})\', src)[:37]); pathlib.Path(sys.argv[2]).write_bytes(vals)" "$2" "$tmpdir/bs_flag.bin" && '
    + '"$4" --update-section .bs_flag="$tmpdir/bs_flag.bin" "$3" && '
    + '"$4" --strip-symbol=main "$3"',
    'decode_obfuscated',
    cc,
    '@INPUT0@',
    '@OUTPUT@',
    objcopy,
  ],
)

emulated_trust_unstripped = executable(
  'emulated_trust_unstripped',
  'main.c',
  'user_interface.c',
  'hash.c',
  'protections.c',
  'validate.c',
  decode_obfuscated,
  link_args: ['-L.'],
)

custom_target(
  'emulated_trust',
  input: emulated_trust_unstripped,
  output: 'bs_emulated_trust',
  command: [
    strip,
    '--keep-symbol=main',
    '--keep-symbol=bs_artifact_tag',
    '--keep-symbol=bs_banner',
    '--keep-symbol=bs_prompt',
    '--keep-symbol=bs_ok',
    '--keep-symbol=bs_denied',
    '--keep-symbol=bs_decode_character',
    '--keep-symbol=bs_validate_input',
    '--keep-symbol=bs_strip_newline',
    '--keep-symbol=bs_hash_memory',
    '--keep-symbol=bs_initialize_environment',
    '@INPUT@',
    '-o', '@OUTPUT@',
  ],
  build_by_default: true,
)
