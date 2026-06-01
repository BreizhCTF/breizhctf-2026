#ifndef VM_H
#define VM_H

/**
 * @brief Initializes the KVM VCPU state (Registers, Segments).
 */
void init_vcpu(void);

/**
 * @brief Starts the background worker thread for KVM execution.
 */
void start_vcpu_worker(void);

#endif
