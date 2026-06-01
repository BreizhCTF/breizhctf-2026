#ifndef USER_INTERFACE_H
#define USER_INTERFACE_H

extern const char *bs_artifact_tag;

void bs_banner();
void bs_prompt();
void bs_ok();
void bs_denied();
void bs_strip_newline(char *string);

#endif
