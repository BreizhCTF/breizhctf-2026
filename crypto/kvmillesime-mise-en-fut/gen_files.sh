#!/bin/bash

# Generate the diffs so it's easier to see what's going on
diff src/furniture/base_svm_sources/orig_svm.c src/L1_kernel/svm.c > files/diff_svm.c

rm files/sources.zip
7z a files/sources.zip src/L1_kernel/*.{h,c} src/L1_vm_runner/*.{h,c} src/L2_stockbot/*.{c,h} files/diff_svm.c

