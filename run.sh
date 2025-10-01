#!/bin/bash

# Use environment variables or defaults
API_HOST=${API_HOST:-127.0.0.1}
API_PORT=${API_PORT:-8000}

uvicorn app.main:app --host $API_HOST --port $API_PORT --reload
