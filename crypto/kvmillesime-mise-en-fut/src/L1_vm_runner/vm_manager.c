#include <linux/kvm.h>
#include <fcntl.h>
#include <stdint.h>
#include <sys/mman.h>
#include <stdio.h>
#include <sys/ioctl.h>

#include "vm_manager.h"
#include "utils.h"


int init_vm(int32_t *p_vm_hnd, int32_t *p_vcpu_hnd, struct kvm_run **pRun) {
    int kvm_hnd, vm_hnd, vcpu_hnd; 
    int ret;
    int run_sz = 0;
    struct kvm_regs regs = {0};
    struct kvm_sregs sregs = {0};

    ret = 0;
    
    kvm_hnd = open("/dev/kvm", O_RDONLY);
    CHECK(kvm_hnd >= 0, "[!] Failed to create kvm handle\n");

    run_sz = ioctl(kvm_hnd, KVM_GET_VCPU_MMAP_SIZE, 0);
    CHECK(run_sz > 0, "[!] KVM_GET_VCPU_MMAP_SIZE failed\n");



    LOGD("Creating a vm\n");
    vm_hnd =  ioctl(kvm_hnd, KVM_CREATE_VM, 0);
    CHECK(vm_hnd >= 0, "[!] KVM_CREATE_VM failed\n");
    


    // ----- Create VCPU
    vcpu_hnd = ioctl(vm_hnd, KVM_CREATE_VCPU, 0);
    CHECK(vcpu_hnd >= 0, "[!] CREATE_VCPU failed\n");
    
    *pRun = (struct kvm_run*)mmap(NULL, run_sz, PROT_READ | PROT_WRITE, MAP_SHARED, vcpu_hnd, 0);
    CHECK(MAP_FAILED != *pRun, "[!] Could not mmap vm data\n");
    // Set the regs of the VCPU
    //  Make it so cs starts at 0
    ret = ioctl(vcpu_hnd, KVM_GET_SREGS, &sregs);
    CHECK(ret >= 0, "[!] GET_SREGS \n");
    sregs.cs.base = 0;
    sregs.cs.selector = 0;
    ret = ioctl(vcpu_hnd, KVM_SET_SREGS, &sregs);
    CHECK(ret >= 0, "[!] SET_SREGS\n");

    regs.rip = 0;
    regs.rflags = 2; // bit 1 must be set to 1 on x86
    ret = ioctl(vcpu_hnd, KVM_SET_REGS, &regs);
    CHECK(ret >= 0, "[!] SET_REGS\n");

    end:
    if (kvm_hnd > 0) { close(kvm_hnd);}
    *p_vm_hnd = vm_hnd;
    *p_vcpu_hnd = vcpu_hnd;

    return ret;
    
}

int allocate_guest_mem(int32_t vm_hnd, uint32_t sz_ram, uint8_t **p_guest_mem) {
    struct kvm_userspace_memory_region s_vm_mem = {0};
    uint8_t *host_vm_mem = 0;
    int ret = 0;


        // -------------------- Allocate mem
    LOGD("Allocating user mem\n");
    host_vm_mem = mmap(NULL, sz_ram, PROT_READ | PROT_WRITE | PROT_EXEC, MAP_SHARED | MAP_ANONYMOUS,-1,0);
    s_vm_mem.guest_phys_addr = 0;
    s_vm_mem.userspace_addr = (uintptr_t)host_vm_mem;
    s_vm_mem.memory_size = sz_ram;

    ret = ioctl(vm_hnd, KVM_SET_USER_MEMORY_REGION, (uintptr_t)(&s_vm_mem));
    CHECK(ret >= 0, "[!] KVM_SET_USER_MEMORY_REGION failed \n");



    end:
    *p_guest_mem = host_vm_mem;
    return ret;

}