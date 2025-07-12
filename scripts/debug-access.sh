#!/bin/bash

# debug-access.sh - Temporarily enable debug tool access in production
# Usage: ./scripts/debug-access.sh [enable|disable]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEBUG_STORAGE="$PROJECT_ROOT/.debug-tools"
PUBLIC_DIR="$PROJECT_ROOT/public"
DEBUG_FILE="debug-chat-420253MSP.html"
LOCKFILE="/tmp/boba-chat-debug.lock"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

case "$1" in
    enable)
        # Check if debug file exists
        if [ ! -f "$DEBUG_STORAGE/$DEBUG_FILE" ] && [ ! -f "$PROJECT_ROOT/$DEBUG_FILE" ]; then
            echo -e "${RED}Error: Debug file not found${NC}"
            echo "Expected location: $DEBUG_STORAGE/$DEBUG_FILE"
            exit 1
        fi

        # Move debug file to storage if it's in project root
        if [ -f "$PROJECT_ROOT/$DEBUG_FILE" ]; then
            mkdir -p "$DEBUG_STORAGE"
            echo -e "${YELLOW}Moving debug file to secure storage...${NC}"
            mv "$PROJECT_ROOT/$DEBUG_FILE" "$DEBUG_STORAGE/"
        fi

        # Generate random filename
        RANDOM_NAME="diagnostic-$(date +%s)-$(openssl rand -hex 8).html"
        
        # Copy to public with random name
        cp "$DEBUG_STORAGE/$DEBUG_FILE" "$PUBLIC_DIR/$RANDOM_NAME"
        
        # Create lock file with info
        echo "$RANDOM_NAME" > "$LOCKFILE"
        
        echo -e "${GREEN}Debug tool enabled!${NC}"
        echo -e "Access at: ${GREEN}/$RANDOM_NAME${NC}"
        echo -e "${YELLOW}Auto-removal in 30 minutes${NC}"
        
        # Schedule automatic removal
        (
            sleep 1800
            if [ -f "$PUBLIC_DIR/$RANDOM_NAME" ]; then
                rm -f "$PUBLIC_DIR/$RANDOM_NAME" "$LOCKFILE"
                echo -e "${YELLOW}Debug tool auto-removed after 30 minutes${NC}"
            fi
        ) &
        
        echo "PID of cleanup job: $!"
        ;;
        
    disable)
        if [ -f "$LOCKFILE" ]; then
            FILENAME=$(cat "$LOCKFILE")
            if [ -f "$PUBLIC_DIR/$FILENAME" ]; then
                rm -f "$PUBLIC_DIR/$FILENAME" "$LOCKFILE"
                echo -e "${GREEN}Debug tool disabled and removed${NC}"
            else
                echo -e "${YELLOW}Debug file already removed${NC}"
                rm -f "$LOCKFILE"
            fi
        else
            # Clean up any diagnostic files
            REMOVED=0
            for file in "$PUBLIC_DIR"/diagnostic-*.html; do
                if [ -f "$file" ]; then
                    rm -f "$file"
                    REMOVED=$((REMOVED + 1))
                fi
            done
            
            if [ $REMOVED -gt 0 ]; then
                echo -e "${GREEN}Removed $REMOVED debug file(s)${NC}"
            else
                echo -e "${YELLOW}No active debug sessions found${NC}"
            fi
        fi
        ;;
        
    status)
        if [ -f "$LOCKFILE" ]; then
            FILENAME=$(cat "$LOCKFILE")
            if [ -f "$PUBLIC_DIR/$FILENAME" ]; then
                echo -e "${GREEN}Debug tool is ACTIVE${NC}"
                echo -e "Access at: ${GREEN}/$FILENAME${NC}"
            else
                echo -e "${YELLOW}Lock file exists but debug file is missing${NC}"
            fi
        else
            echo -e "${YELLOW}Debug tool is INACTIVE${NC}"
        fi
        ;;
        
    *)
        echo "Usage: $0 {enable|disable|status}"
        echo ""
        echo "Commands:"
        echo "  enable  - Copy debug tool to public dir with random name (30 min TTL)"
        echo "  disable - Remove debug tool from public dir"
        echo "  status  - Check if debug tool is currently accessible"
        exit 1
        ;;
esac