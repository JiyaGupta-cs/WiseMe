#!/bin/bash

# Configuration
BACKUP_DIR="./db_backups"
GITHUB_REPO="WiseMeOrg/backup"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="wiseme_backup_${TIMESTAMP}.sql"

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo "Options:"
    echo "  -l, --local-only     Create backup locally without pushing to GitHub"
    echo "  -e, --encrypt        Encrypt the backup using GPG"
    echo "  -k, --key-id KEY     GPG key ID to use for encryption"
    echo "  -h, --help           Show this help message"
    echo ""
    echo "Example:"
    echo "  $0 --local-only                     # Local backup only"
    echo "  $0 --encrypt --key-id user@email.com # Encrypted backup"
    echo "  $0                                  # Default: backup and push to GitHub"
}

# Validate required environment variables
if [ -z "$DB_URL" ]; then
    echo "Error: DB_URL environment variable is not set"
    exit 1
fi

# Parse command line arguments
LOCAL_ONLY=false
ENCRYPT=false
GPG_KEY_ID=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -l|--local-only)
            LOCAL_ONLY=true
            shift
            ;;
        -e|--encrypt)
            ENCRYPT=true
            shift
            ;;
        -k|--key-id)
            GPG_KEY_ID="$2"
            shift
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validate encryption options
if [ "$ENCRYPT" = true ] && [ -z "$GPG_KEY_ID" ]; then
    echo "Error: GPG key ID must be provided when using encryption"
    show_usage
    exit 1
fi

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Create backup
echo "Creating database backup..."
pg_dump "$DB_URL" > "$BACKUP_DIR/$BACKUP_FILE" # AHHH!!! Bad workaround for now : ((

if [ $? -eq 0 ]; then
    echo "Backup created successfully!"
else
    echo "Backup failed!"
    exit 1
fi

# Encrypt backup if requested
if [ "$ENCRYPT" = true ]; then
    echo "Encrypting backup..."
    # Use --batch and --yes to avoid interactive prompts
    gpg --batch --yes --passphrase "${GPG_PASSPHRASE}" --trust-model always --recipient "$GPG_KEY_ID" --encrypt "$BACKUP_DIR/$BACKUP_FILE"
    if [ $? -eq 0 ]; then
        echo "Backup encrypted successfully!"
        # Remove the unencrypted file
        rm "$BACKUP_DIR/$BACKUP_FILE"
        # Update backup file name to include .gpg extension
        BACKUP_FILE="${BACKUP_FILE}.gpg"
    else
        echo "Encryption failed!"
        exit 1
    fi
fi

# Push to GitHub if not local-only
if [ "$LOCAL_ONLY" = false ]; then
    # Initialize git repo if not already initialized
    if [ ! -d .git ]; then
        git init
        git checkout -b master  # Create and switch to master branch
    fi

    # Always ensure we're using the token for authentication
    git remote remove origin 2>/dev/null || true
    git remote add origin "https://x-access-token:${PERSONAL_GITHUB_TOKEN}@github.com/${GITHUB_REPO}.git"

    # Add, commit and push the backup
    git add "$BACKUP_DIR/$BACKUP_FILE"  # Ensure the correct file is added
    git commit -m "Database backup - ${TIMESTAMP}"
    
    # Check if the commit was successful before pushing
    if [ $? -eq 0 ]; then
        git push origin master  # Push to master branch
        echo "Backup has been pushed to GitHub!"
    else
        echo "No changes to push."
    fi
fi

# Cleanup old backups (keeps last 24 backups) // Imagine if we are runing it every hour, we can store backup for a day...
cd "$BACKUP_DIR"
if [ "$ENCRYPT" = true ]; then
    ls -t *.sql.gpg 2>/dev/null | tail -n +25 | xargs -r rm
else
    ls -t *.sql.gpg 2>/dev/null | tail -n +25 | xargs -r rm
fi

echo "Old backups cleaned up. Process complete!"

