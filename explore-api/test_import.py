from main import app
print("Import OK, app:", app.title)
print("Routes:")
for route in app.routes:
    if hasattr(route, 'methods'):
        print(f"  {route.methods} {route.path}")
