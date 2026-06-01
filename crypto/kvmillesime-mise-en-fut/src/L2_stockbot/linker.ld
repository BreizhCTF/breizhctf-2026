ENTRY(_start)

SECTIONS
{
    . = 0x0;

    /* Code */
    .text : {
        *(.text.boot)
        *(.text)
    }

    /* Données initialisées (ex: char *msg = "hello") */
    .data : {
        *(.data)
    }

    /* Données NON initialisées (ex: char buf[0x1000]) */
    .bss : {
        bss_start = .; 
        *(.bss)
        *(COMMON) 
        bss_end = .; 
    }
    
    /* On aligne sur 4 octets pour la performance */
    . = ALIGN(4);
}