#!/bin/bash

# Set OSO_URL environment variable
export OSO_URL="http://localhost:8080"

# Set OSO_AUTH environment variable
export OSO_AUTH="e_0123456789_12345_osotesttoken01xiIn"

# Print the set environment variables (optional, for verification)
echo "OSO_URL set to: $OSO_URL"
echo "OSO_AUTH set to: $OSO_AUTH"

# Optionally, you can add a message to inform the user how to use these variables
echo "Environment variables have been set for the current shell session."
echo "To use these in your application, run your command in the same shell session."