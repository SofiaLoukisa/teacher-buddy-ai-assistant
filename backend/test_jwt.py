import jwt
import sys

# Get token from command line
if len(sys.argv) < 2:
    print("Usage: python test_jwt.py <token>")
    sys.exit(1)

token = sys.argv[1]

# Decode without verification to see the structure
try:
    decoded = jwt.decode(token, options={"verify_signature": False})
    print("Token decoded successfully:")
    print(decoded)
except Exception as e:
    print(f"Error decoding token: {e}")
