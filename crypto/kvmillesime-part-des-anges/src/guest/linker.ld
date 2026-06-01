SECTIONS
{
    . = 0x0;
    .text : {
        *(.text.entry)
        *(.text)
    }
    .rodata : { *(.rodata*) }
    .data : { *(.data) }
    .bss : { *(.bss) }
}
