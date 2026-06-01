#!/bin/bash

uv run src/generate_setup.py
mv server_config.json src/src/

cp intercepted_data.json files/
cp intercepted_data.json solve/

zip -r files/sources.zip src/src/server.py src/src/templates

