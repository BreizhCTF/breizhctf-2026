

# --- Configuration des Outils ---
CC = gcc
AS = nasm
LD = ld
OBJCOPY = objcopy

# --- Flags de Compilation ---
# -m32 : Force le mode 32-bits
# -ffreestanding : Indique qu'on n'a pas de libc ni de main standard
# -fno-pie : Pas de code indépendant de la position (on veut des adresses absolues)
# -fno-stack-protector : Pas de canaries de stack (nécessiterait du support OS)
# -nostdlib : Ne pas chercher les librairies système
CFLAGS = -m32 -ffreestanding -fno-pie -fno-stack-protector -nostdlib -Wall -Wextra -c
ifneq ($(FLAG),)
CFLAGS += -DFLAG=\"$(FLAG)\"
endif

ifeq ($(DEBUG),1)
CFLAGS += -DDEBUG
endif

ASFLAGS = -f elf32

# --- Flags de Linkage ---
# -T linker.ld : Utilise notre script de mapping mémoire
# -m elf_i386 : Emulation x86 32-bits
LDFLAGS = -m elf_i386 -T linker.ld

# --- Fichiers Sources ---
# Trouve automatiquement tous les .c et le fichier asm de boot
C_SOURCES = $(wildcard *.c)
ASM_SOURCES = head.asm

# --- Fichiers Objets ---
# Remplace .c/.asm par .o
OBJ = $(ASM_SOURCES:.asm=.o) $(C_SOURCES:.c=.o)

# --- Cible Finale ---
all: guest.bin

# 1. Étape finale : Extraction du binaire pur
guest.bin: guest.elf
	$(OBJCOPY) -O binary $< $@
	@echo "[+] guest.bin generated successfully."

# 2. Étape de Linkage : Combine tous les .o
guest.elf: $(OBJ)
	$(LD) $(LDFLAGS) -o $@ $^

# 3. Règle générique pour l'assembleur
%.o: %.asm
	$(AS) $(ASFLAGS) $< -o $@

# 4. Règle générique pour le C
%.o: %.c
	$(CC) $(CFLAGS) $< -o $@

# Nettoyage
clean:
	rm -f *.o *.bin *.elf

.PHONY: all clean


