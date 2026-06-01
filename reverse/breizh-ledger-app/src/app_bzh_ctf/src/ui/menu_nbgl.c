#include <stdio.h>

#include "os.h"
#include "glyphs.h"
#include "nbgl_use_case.h"

#include "globals.h"
#include "menu.h"
#include "display.h"

void app_quit(void) {
    os_sched_exit(-1);
}

#define SETTING_INFO_NB 2
static const char *const INFO_TYPES[SETTING_INFO_NB] = {"Version", "Developer"};
static const char *const INFO_CONTENTS[SETTING_INFO_NB] = {APPVERSION, "SaletteGaucisse"};

static const nbgl_contentInfoList_t infoList = {
    .nbInfos = SETTING_INFO_NB,
    .infoTypes = INFO_TYPES,
    .infoContents = INFO_CONTENTS,
};

void ui_display_secret_mode_activated(void) {
    nbgl_useCaseStatus("Mode Breizh\n Actif", true, ui_menu_main);
}

static char flag_buffer[64];

void ui_display_flag(const char *flag) {
    snprintf(flag_buffer, sizeof(flag_buffer), "%s", flag);
    nbgl_useCaseStatus(flag_buffer, true, ui_menu_main);
}

void ui_menu_main(void) {
    nbgl_useCaseHomeAndSettings(APPNAME,
                                &ICON_APP_HOME,
                                NULL,
                                INIT_HOME_PAGE,
                                NULL,
                                &infoList,
                                NULL,
                                app_quit);
}
