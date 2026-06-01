project(
  'phase-zero',
  'c',
  version: '1.0.0',
  default_options: [
    'c_std=c23',
    'buildtype=plain',
    'optimization=1',
  ],
)

strip = find_program('strip')

phase_zero_unstripped = executable(
  'phase_zero_unstripped',
  'main.c',
)

custom_target(
  'bs_phase_zero',
  input: phase_zero_unstripped,
  output: 'bs_phase_zero',
  command: [
    strip,
    '--keep-symbol=main',
    '--keep-symbol=bs_artifact_tag',
    '--keep-symbol=bs_banner',
    '--keep-symbol=bs_prompt',
    '--keep-symbol=bs_ok',
    '--keep-symbol=bs_denied',
    '--keep-symbol=bs_strip_newline',
    '--keep-symbol=bs_guard',
    '--keep-symbol=bs_xor_decode',
    '@INPUT@',
    '-o', '@OUTPUT@',
  ],
  build_by_default: true,
)
