#pragma once
#include <linux/kvm.h>
#include <unistd.h>

int init_vm(int32_t *p_vm_hnd, int32_t *p_vcpu_hnd, struct kvm_run **pRun);
int allocate_guest_mem(int32_t vm_hnd, uint32_t sz_ram, uint8_t **p_guest_mem);