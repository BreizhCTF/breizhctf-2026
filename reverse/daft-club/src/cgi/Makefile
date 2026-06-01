CXX      = g++
CXXFLAGS = -O2 -Wall -std=c++17 -I.
LDFLAGS  = -ldl
TARGET   = validator

all: $(TARGET)

$(TARGET): validator.cpp DaftClubDRM/wb_aes.h DaftClubDRM/wb_tables.h \
            RASP/RASP.h++ RASP/ObfStr.h++
	$(CXX) $(CXXFLAGS) -o $(TARGET) validator.cpp $(LDFLAGS)
	strip --strip-all \
	      -R .comment \
	      -R .note \
	      -R .note.ABI-tag \
	      -R .gnu.version \
	      $(TARGET)

wbgen: DaftClubDRM/wbgen/wbgen.cpp
	$(CXX) $(CXXFLAGS) -o wbgen DaftClubDRM/wbgen/wbgen.cpp
	@echo "Run: ./wbgen <key_hex_32chars> \"DAFT-XXXXX-XXXXX-XXXXX\""

install: $(TARGET)
	install -d /usr/lib/cgi-bin
	install -m 755 $(TARGET) /usr/lib/cgi-bin/$(TARGET)

clean:
	rm -f $(TARGET) wbgen

.PHONY: all wbgen install clean
