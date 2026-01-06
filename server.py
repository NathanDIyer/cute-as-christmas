#!/usr/bin/env python3
"""
Simple HTTP server for testing Cute As Christmas locally.
Run this script and open http://localhost:8000 in your browser.

Usage: python3 server.py [port]
Default port is 8000.
"""

import sys
import http.server
import socketserver
import webbrowser
from pathlib import Path

def main():
    # Get port from command line argument or use default
    port = 8000
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print(f"Invalid port number: {sys.argv[1]}")
            sys.exit(1)
    
    # Change to the directory containing this script
    script_dir = Path(__file__).parent
    try:
        import os
        os.chdir(script_dir)
    except OSError as e:
        print(f"Error changing to directory {script_dir}: {e}")
        sys.exit(1)
    
    # Create HTTP handler
    handler = http.server.SimpleHTTPRequestHandler
    
    try:
        with socketserver.TCPServer(("", port), handler) as httpd:
            print(f"Serving Cute As Christmas at http://localhost:{port}")
            print("Press Ctrl+C to stop the server")
            
            # Try to open browser automatically
            try:
                webbrowser.open(f"http://localhost:{port}")
                print("Opened game in your default browser")
            except Exception:
                print("Could not open browser automatically")
                print(f"Please manually open http://localhost:{port} in your browser")
            
            httpd.serve_forever()
            
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"Port {port} is already in use. Try a different port:")
            print(f"python3 server.py {port + 1}")
        else:
            print(f"Error starting server: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\nServer stopped")

if __name__ == "__main__":
    main()