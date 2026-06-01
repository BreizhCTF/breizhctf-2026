; head.asm
BITS 16
global _start
extern main

section .text.boot ; On force cette section au tout début via le linker script

_start:
    cli                 ; Désactive les interruptions (le runner ne les gère pas encore)

    ; 1. Charger la GDT
    lgdt [gdt_descriptor]

    ; 2. Passer en Mode Protégé (Set bit 0 of CR0)
    mov eax, cr0
    or eax, 1
    mov cr0, eax

    ; 3. Far Jump pour recharger CS avec le sélecteur 0x08 (CODE_SEG)
    jmp 0x08:init_32

BITS 32
init_32:
    ; 4. Initialiser les segments de données (Selecteur 0x10 = DATA_SEG)
    mov ax, 0x10
    mov ds, ax
    mov es, ax
    mov fs, ax
    mov gs, ax
    mov ss, ax

    ; 5. Initialiser la Stack
    ; Le runner alloue 0x1000000 (16MB). On met la stack tout en haut.
    mov esp, 0x1000000

    extern bss_start
    extern bss_end
    ; Nettoyage du .bss

    mov edi, bss_start
    mov ecx, bss_end
    sub ecx, bss_start
    xor eax, eax
    rep stosb

    ; 6. Saut vers le C
    call main

    ; 7. Si main retourne, on arrête tout
    hlt
    jmp $

; --- GDT DEFINITION ---
gdt_start:
    ; Null Descriptor (0x00)
    dd 0x0
    dd 0x0

    ; Code Descriptor (0x08)
    ; Base=0, Limit=0xFFFFF, Granularity=4KB (donc 4GB total), 32-bit, Priv=0
    dw 0xffff    ; Limit (bits 0-15)
    dw 0x0000    ; Base (bits 0-15)
    db 0x00      ; Base (bits 16-23)
    db 10011010b ; Access (Present, Ring0, Code, Exec/Read)
    db 11001111b ; Flags (4KB gran, 32-bit) + Limit (bits 16-19)
    db 0x00      ; Base (bits 24-31)

    ; Data Descriptor (0x10)
    ; Exactement pareil, sauf l'Access byte pour Data
    dw 0xffff
    dw 0x0000
    db 0x00
    db 10010010b ; Access (Present, Ring0, Data, Read/Write)
    db 11001111b
    db 0x00

gdt_end:

gdt_descriptor:
    dw gdt_end - gdt_start - 1 ; Taille (Limit)
    dd gdt_start               ; Adresse de base