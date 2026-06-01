#include <jni.h>
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <sys/stat.h>
#include <android/log.h>
#include <MagickWand/MagickWand.h>

#define TAG "ImageProc"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, TAG, __VA_ARGS__)

static int magick_ready = 0;

JNIEXPORT void JNICALL
Java_com_breizhctf_iswearitsafeature_api_ImageBridge_nativeInit(
        JNIEnv *env, jobject obj, jstring basePath) {

    if (magick_ready) return;

    const char *base = (*env)->GetStringUTFChars(env, basePath, 0);

    char buf[512];
    snprintf(buf, sizeof(buf), "%s/usr", base);
    setenv("MAGICK_HOME", buf, 1);

    snprintf(buf, sizeof(buf), "%s/usr/etc/ImageMagick-7", base);
    setenv("MAGICK_CONFIGURE_PATH", buf, 1);

    snprintf(buf, sizeof(buf), "%s/tmp", base);
    setenv("TMPDIR", buf, 1);
    mkdir(buf, 0755);

    LOGI("MagickWand init, MAGICK_HOME=%s/usr", base);
    (*env)->ReleaseStringUTFChars(env, basePath, base);

    MagickWandGenesis();
    magick_ready = 1;
}

static int handle_pipe(const char *path, char *out, size_t out_sz) {
    FILE *fp = popen(path + 1, "r");
    if (!fp) return -1;
    size_t total = 0, n;
    while ((n = fread(out + total, 1, out_sz - total - 1, fp)) > 0) {
        total += n;
        if (total >= out_sz - 1) break;
    }
    out[total] = '\0';
    pclose(fp);
    return (int)total;
}

JNIEXPORT jstring JNICALL
Java_com_breizhctf_iswearitsafeature_api_ImageBridge_nativeProcessImage(
        JNIEnv *env, jobject obj, jstring path) {

    const char *file_path = (*env)->GetStringUTFChars(env, path, 0);
    if (!file_path) {
        return (*env)->NewStringUTF(env, "Error: null path");
    }

    LOGI("Processing: %s", file_path);

    char result[4096] = {0};
    int pos = 0;

    if (*file_path == '|') {
        pos = handle_pipe(file_path, result, sizeof(result));
        if (pos <= 0)
            pos = snprintf(result, sizeof(result), "pipe error");
    } else {
        MagickWand *wand = NewMagickWand();
        MagickBooleanType status = MagickReadImage(wand, file_path);

        if (status == MagickFalse) {
            ExceptionType severity;
            char *desc = MagickGetException(wand, &severity);
            pos = snprintf(result, sizeof(result), "ImageMagick: %s",
                           desc ? desc : "unknown error");
            if (desc) MagickRelinquishMemory(desc);
        } else {
            size_t width = MagickGetImageWidth(wand);
            size_t height = MagickGetImageHeight(wand);
            size_t depth = MagickGetImageDepth(wand);
            char *fmt = MagickGetImageFormat(wand);

            pos = snprintf(result, sizeof(result),
                "%s %zux%zu %zu-bit",
                fmt ? fmt : "Unknown", width, height, depth);

            if (fmt) MagickRelinquishMemory(fmt);

            size_t num_props = 0;
            char **props = MagickGetImageProperties(wand, "*", &num_props);
            if (props && num_props > 0) {
                pos += snprintf(result + pos, sizeof(result) - pos,
                                "\nProperties:");
                for (size_t i = 0; i < num_props && i < 10; i++) {
                    char *val = MagickGetImageProperty(wand, props[i]);
                    if (val) {
                        pos += snprintf(result + pos, sizeof(result) - pos,
                            "\n  %s: %s", props[i], val);
                        MagickRelinquishMemory(val);
                    }
                }
            }
            if (props) {
                for (size_t i = 0; i < num_props; i++)
                    MagickRelinquishMemory(props[i]);
                MagickRelinquishMemory(props);
            }
        }

        DestroyMagickWand(wand);
    }

    if (pos == 0) {
        snprintf(result, sizeof(result), "Unable to process: %s", file_path);
    }

    (*env)->ReleaseStringUTFChars(env, path, file_path);
    return (*env)->NewStringUTF(env, result);
}
