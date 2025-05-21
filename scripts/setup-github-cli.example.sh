#!/bin/bash

# Check if gh is installed
if ! command -v gh &> /dev/null; then
    echo "GitHub CLI is not installed. Installing..."
    
    # Detect OS and install accordingly
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        brew install gh
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
        sudo apt update
        sudo apt install gh
    else
        echo "Unsupported OS. Please install GitHub CLI manually."
        exit 1
    fi
fi

# Set GitHub token as environment variable
export GITHUB_TOKEN="your-github-token-here"

# Authenticate with GitHub
echo "Authenticating with GitHub..."
gh auth login --with-token <<< "$GITHUB_TOKEN"

echo "GitHub CLI setup complete!" 