#!/bin/bash

USER = "tno-terminology-design"
REPO = "tev2-specifications"
BRANCH = "main"
DIR = "footer-links"

# Download the ZIP of the branch
wget "https://github.com/$USER/$REPO/archive/$BRANCH.zip"

# Extract the specific directory's contents directly to the current location
unzip -j "$BRANCH.zip" "$REPO-$BRANCH/$DIR/*" -d "./"

# Cleanup
rm -rf "$REPO-$BRANCH" "$BRANCH.zip"
