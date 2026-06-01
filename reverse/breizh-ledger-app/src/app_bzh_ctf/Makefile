# ****************************************************************************
#    Ledger App Boilerplate
#    (c) 2023 Ledger SAS.
#
#   Licensed under the Apache License, Version 2.0 (the "License");
#   you may not use this file except in compliance with the License.
#   You may obtain a copy of the License at
#
#       http://www.apache.org/licenses/LICENSE-2.0
#
#   Unless required by applicable law or agreed to in writing, software
#   distributed under the License is distributed on an "AS IS" BASIS,
#   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#   See the License for the specific language governing permissions and
#   limitations under the License.
# ****************************************************************************

ifeq ($(BOLOS_SDK),)
$(error Environment variable BOLOS_SDK is not set)
endif

include $(BOLOS_SDK)/Makefile.target

########################################
#        Mandatory configuration       #
########################################
# Application name
APPNAME = "LedgerBreizhApp"

# Application version
APPVERSION_M = 2
APPVERSION_N = 3
APPVERSION_P = 1
APPVERSION = "$(APPVERSION_M).$(APPVERSION_N).$(APPVERSION_P)"

# Application source files
APP_SOURCE_PATH += src

# Application icons following guidelines:
# https://developers.ledger.com/docs/embedded-app/design-requirements/#device-icon
ICON_STAX = icons/app_boilerplate_32px.gif

# Application allowed derivation curves.
CURVE_APP_LOAD_PARAMS = secp256k1

# Application allowed derivation paths.
PATH_APP_LOAD_PARAMS = "44'/1'"

# Setting to allow building variant applications
VARIANT_PARAM = COIN
VARIANT_VALUES = BOL

# Enabling DEBUG flag will enable PRINTF for speculos
#DEBUG = 1

########################################
# Application communication interfaces #
########################################

########################################
#         NBGL custom features         #
########################################
ENABLE_NBGL_QRCODE = 1

include $(BOLOS_SDK)/Makefile.standard_app
