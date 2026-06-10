import ast, sys
with open("routers/jobs.py") as f:
    ast.parse(f.read())
print("Syntax OK")
