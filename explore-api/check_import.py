import sys
try:
    from main import app
    print("Import OK")
except Exception as e:
    print(f"Import FAILED: {e}")
    sys.exit(1)
