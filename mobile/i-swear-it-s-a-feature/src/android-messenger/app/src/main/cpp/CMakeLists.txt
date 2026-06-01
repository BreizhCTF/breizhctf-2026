cmake_minimum_required(VERSION 3.22.1)
project("imageproc")

# Map Android ABI to ImageMagick config directory
if(${ANDROID_ABI} STREQUAL "arm64-v8a")
    set(IM_ARCH "arm64")
elseif(${ANDROID_ABI} STREQUAL "x86_64")
    set(IM_ARCH "x86-64")
endif()

set(IM_DIR ${CMAKE_SOURCE_DIR}/ImageMagick-7.1.2-21)
set(IM_LIB_DIR ${CMAKE_SOURCE_DIR}/../jniLibs/${ANDROID_ABI})

# Import prebuilt ImageMagick libs
add_library(magickcore SHARED IMPORTED)
set_target_properties(magickcore PROPERTIES IMPORTED_LOCATION ${IM_LIB_DIR}/libmagickcore-7.so)

add_library(magickwand SHARED IMPORTED)
set_target_properties(magickwand PROPERTIES IMPORTED_LOCATION ${IM_LIB_DIR}/libmagickwand-7.so)

add_library(imageproc SHARED imageproc.c)

target_include_directories(imageproc PRIVATE
    ${IM_DIR}/configs/${IM_ARCH}
    ${IM_DIR}
)

target_compile_definitions(imageproc PRIVATE
    MAGICKCORE_HDRI_ENABLE=1
    MAGICKCORE_QUANTUM_DEPTH=16
)

target_link_libraries(imageproc log dl magickwand magickcore)
