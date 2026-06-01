#pragma once 

#define CHECK(b, msg) { \
if(!(b)) { \
    printf(msg);\
    perror("Errno related: "); \
    ret = -1; \
    goto end; \
}}


#ifdef DEBUG 
#define LOGD(msg) printf("[i]" msg);
#else
#define LOGD(msg)
#endif