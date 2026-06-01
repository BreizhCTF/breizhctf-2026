#include "qemu/osdep.h"
#include "hw/pci/pci.h"
#include "hw/pci/pci_device.h"
#include "migration/vmstate.h"
#include "qemu/module.h"
#include "qom/object.h"
#include "qemu/log.h"

#define TYPE_PCI_RNG_ASCENDING "pci-rng-ascending"
OBJECT_DECLARE_SIMPLE_TYPE(PCIRngAscendingState, PCI_RNG_ASCENDING)

struct PCIRngAscendingState {
    PCIDevice parent_obj;

    MemoryRegion mmio;
    uint64_t lfsr_state[2];
    uint64_t n_counter;
    uint32_t last_guess_ok;
};

// Meta-comment. Ce n'est pas un challenge de crypto.
// Vous pouvez essayer de casser le LFSR, mais c'est probablement plus
// dur que l'intended.
static uint64_t xorshift128plus(uint64_t s[2])
{
    uint64_t x = s[0];
    uint64_t const y = s[1];
    s[0] = y;
    x ^= x << 23;
    s[1] = x ^ y ^ (x >> 17) ^ (y >> 26);
    return s[1] ^ y;
}

static uint64_t pci_rng_ascending_read(void *opaque, hwaddr addr, unsigned size)
{
    PCIRngAscendingState *d = opaque;
    uint64_t val = 0;

    if (addr == 0x00 && size == 8) {
        uint64_t r = (xorshift128plus(d->lfsr_state) % 127) + 1;
        d->n_counter += r;
        val = d->n_counter;
    } else if (addr == 0x10 && size == 4) {
        val = d->last_guess_ok;
    } else {
        qemu_log_mask(LOG_GUEST_ERROR, "pci-rng-ascending: read at bad offset 0x%" HWADDR_PRIx "\n", addr);
    }
    
    return val;
}

static void pci_rng_ascending_write(void *opaque, hwaddr addr, uint64_t val, unsigned size)
{
    PCIRngAscendingState *d = opaque;
    if (addr == 0x08 && size == 8) {
        uint64_t r = (xorshift128plus(d->lfsr_state) % 127) + 1;
        d->n_counter += r;
        d->last_guess_ok = (val == d->n_counter);
    } else {
        qemu_log_mask(LOG_GUEST_ERROR, "pci-rng-ascending: write at offset 0x%" HWADDR_PRIx "\n", addr);
    }
}

static const MemoryRegionOps pci_rng_ascending_ops = {
    .read = pci_rng_ascending_read,
    .write = pci_rng_ascending_write,
    .endianness = DEVICE_LITTLE_ENDIAN,
    .impl = {
        .min_access_size = 4,
        .max_access_size = 8,
    },
};

static void pci_rng_ascending_realize(PCIDevice *pci_dev, Error **errp)
{
    PCIRngAscendingState *d = PCI_RNG_ASCENDING(pci_dev);
    uint8_t *pci_conf = pci_dev->config;

    pci_config_set_interrupt_pin(pci_conf, 1);

    memory_region_init_io(&d->mmio, OBJECT(d), &pci_rng_ascending_ops, d, "pci-rng-ascending-mmio", 4096);
    pci_register_bar(pci_dev, 0, PCI_BASE_ADDRESS_SPACE_MEMORY, &d->mmio);

    int fd = open("/dev/urandom", O_RDONLY);
    if (fd >= 0) {
        if (read(fd, &d->lfsr_state[0], sizeof(uint64_t)) != sizeof(uint64_t)) {
            qemu_log_mask(LOG_GUEST_ERROR, "failed to seed lfsr[0]\n");
        }
        if (read(fd, &d->lfsr_state[1], sizeof(uint64_t)) != sizeof(uint64_t)) {
            qemu_log_mask(LOG_GUEST_ERROR, "failed to seed lfsr[1]\n");
        }
        if (read(fd, &d->n_counter, sizeof(uint64_t)) != sizeof(uint64_t)) {
            qemu_log_mask(LOG_GUEST_ERROR, "failed to seed n_counter\n");
        }
        close(fd);
    }
    d->last_guess_ok = 0;
}

static const VMStateDescription vmstate_pci_rng_ascending = {
    .name = "pci-rng-ascending",
    .version_id = 1,
    .minimum_version_id = 1,
    .fields = (const VMStateField[]) {
        VMSTATE_PCI_DEVICE(parent_obj, PCIRngAscendingState),
        VMSTATE_UINT64_ARRAY(lfsr_state, PCIRngAscendingState, 2),
        VMSTATE_UINT32(last_guess_ok, PCIRngAscendingState),
        VMSTATE_END_OF_LIST()
    }
};

static void pci_rng_ascending_class_init(ObjectClass *class, const void *data)
{
    DeviceClass *dc = DEVICE_CLASS(class);
    PCIDeviceClass *k = PCI_DEVICE_CLASS(class);

    k->realize = pci_rng_ascending_realize;
    k->vendor_id = 0x1337;
    k->device_id = 0x0042;
    k->class_id = PCI_CLASS_OTHERS;
    set_bit(DEVICE_CATEGORY_MISC, dc->categories);
    dc->vmsd = &vmstate_pci_rng_ascending;
}

static const TypeInfo pci_rng_ascending_info = {
    .name = TYPE_PCI_RNG_ASCENDING,
    .parent = TYPE_PCI_DEVICE,
    .instance_size = sizeof(PCIRngAscendingState),
    .class_init = pci_rng_ascending_class_init,
    .interfaces = (InterfaceInfo[]) {
        { INTERFACE_PCIE_DEVICE },
        { }
    },
};

static void pci_rng_ascending_register_types(void)
{
    type_register_static(&pci_rng_ascending_info);
}

type_init(pci_rng_ascending_register_types)
