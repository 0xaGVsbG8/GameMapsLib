import sqlite3

c = sqlite3.connect("db.sqlite3")
cur = c.cursor()
cur.execute(
    "SELECT name, sql FROM sqlite_master WHERE sql IS NOT NULL ORDER BY name"
)
for name, sql in cur.fetchall():
    print("---", name)
    print(sql)
    print()
