from django.db import migrations, models


def _table_columns(cursor, table):
    cursor.execute(f'PRAGMA table_info("{table}")')
    return {row[1] for row in cursor.fetchall()}


def _restore_sequence(cursor, table):
    cursor.execute(f'SELECT MAX("id") FROM "{table}"')
    max_id = cursor.fetchone()[0] or 0
    cursor.execute("DELETE FROM sqlite_sequence WHERE name = ?", (table,))
    if max_id:
        cursor.execute(
            "INSERT INTO sqlite_sequence(name, seq) VALUES (?, ?)",
            (table, max_id),
        )


def remap_games_primary_key(apps, schema_editor):
    if schema_editor.connection.vendor != "sqlite":
        raise NotImplementedError("Games PK remap is written for SQLite only")

    with schema_editor.connection.cursor() as cursor:
        if "id" in _table_columns(cursor, "blog_games"):
            return

        cursor.execute("PRAGMA foreign_keys = OFF")

        cursor.execute(
            """
            CREATE TABLE "blog_games_new" (
                "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT,
                "name" varchar(100) NOT NULL UNIQUE,
                "public" bool NOT NULL
            )
            """
        )
        cursor.execute(
            'INSERT INTO "blog_games_new" ("name", "public") '
            'SELECT "name", "public" FROM "blog_games"'
        )
        cursor.execute("DROP TABLE \"blog_games\"")
        cursor.execute('ALTER TABLE "blog_games_new" RENAME TO "blog_games"')
        _restore_sequence(cursor, "blog_games")

        cursor.execute(
            """
            CREATE TABLE "blog_itemscategories_new" (
                "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT,
                "CategoryName" varchar(100) NOT NULL,
                "GameName_id" bigint NOT NULL REFERENCES "blog_games" ("id") DEFERRABLE INITIALLY DEFERRED,
                CONSTRAINT "unique_category_per_game" UNIQUE ("CategoryName", "GameName_id")
            )
            """
        )
        cursor.execute(
            """
            INSERT INTO "blog_itemscategories_new" ("id", "CategoryName", "GameName_id")
            SELECT c."id", c."CategoryName", g."id"
            FROM "blog_itemscategories" c
            INNER JOIN "blog_games" g ON g."name" = c."GameName_id"
            """
        )
        cursor.execute('DROP TABLE "blog_itemscategories"')
        cursor.execute(
            'ALTER TABLE "blog_itemscategories_new" RENAME TO "blog_itemscategories"'
        )
        cursor.execute(
            'CREATE INDEX "blog_itemscategories_GameName_id_364abda7" '
            'ON "blog_itemscategories" ("GameName_id")'
        )
        _restore_sequence(cursor, "blog_itemscategories")

        cursor.execute(
            """
            CREATE TABLE "blog_itemssubcategories_new" (
                "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT,
                "SubCategoryName" varchar(100) NOT NULL,
                "GameName_id" bigint NOT NULL REFERENCES "blog_games" ("id") DEFERRABLE INITIALLY DEFERRED,
                "PrimalCategory_id" bigint NOT NULL REFERENCES "blog_itemscategories" ("id") DEFERRABLE INITIALLY DEFERRED,
                "Default_icon" varchar(200) NULL,
                CONSTRAINT "unique_subcategory_per_game" UNIQUE ("SubCategoryName", "GameName_id", "PrimalCategory_id")
            )
            """
        )
        cursor.execute(
            """
            INSERT INTO "blog_itemssubcategories_new"
                ("id", "SubCategoryName", "GameName_id", "PrimalCategory_id", "Default_icon")
            SELECT s."id", s."SubCategoryName", g."id", s."PrimalCategory_id", s."Default_icon"
            FROM "blog_itemssubcategories" s
            INNER JOIN "blog_games" g ON g."name" = s."GameName_id"
            """
        )
        cursor.execute('DROP TABLE "blog_itemssubcategories"')
        cursor.execute(
            'ALTER TABLE "blog_itemssubcategories_new" RENAME TO "blog_itemssubcategories"'
        )
        cursor.execute(
            'CREATE INDEX "blog_itemssubcategories_GameName_id_5f4d5331" '
            'ON "blog_itemssubcategories" ("GameName_id")'
        )
        cursor.execute(
            'CREATE INDEX "blog_itemssubcategories_PrimalCategory_id_8b87e301" '
            'ON "blog_itemssubcategories" ("PrimalCategory_id")'
        )
        _restore_sequence(cursor, "blog_itemssubcategories")

        cursor.execute(
            """
            CREATE TABLE "blog_gamemaps_new" (
                "Map_name" varchar(100) NOT NULL PRIMARY KEY,
                "image_path" varchar(200) NOT NULL,
                "width" integer NOT NULL,
                "height" integer NOT NULL,
                "GameName_id" bigint NOT NULL REFERENCES "blog_games" ("id") DEFERRABLE INITIALLY DEFERRED,
                "coordinates_feature" bool NOT NULL,
                "origin_x" real NULL,
                "origin_y" real NULL,
                "pixels_per_unit" real NULL
            )
            """
        )
        cursor.execute(
            """
            INSERT INTO "blog_gamemaps_new" (
                "Map_name", "image_path", "width", "height", "GameName_id",
                "coordinates_feature", "origin_x", "origin_y", "pixels_per_unit"
            )
            SELECT m."Map_name", m."image_path", m."width", m."height", g."id",
                   m."coordinates_feature", m."origin_x", m."origin_y", m."pixels_per_unit"
            FROM "blog_gamemaps" m
            INNER JOIN "blog_games" g ON g."name" = m."GameName_id"
            """
        )
        cursor.execute('DROP TABLE "blog_gamemaps"')
        cursor.execute('ALTER TABLE "blog_gamemaps_new" RENAME TO "blog_gamemaps"')
        cursor.execute(
            'CREATE INDEX "blog_gamemaps_GameName_id_3600cf96" '
            'ON "blog_gamemaps" ("GameName_id")'
        )

        cursor.execute(
            """
            CREATE TABLE "blog_items_new" (
                "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT,
                "ItemName" varchar(100) NOT NULL,
                "x_location" integer NOT NULL,
                "y_location" integer NOT NULL,
                "GameName_id" bigint NOT NULL REFERENCES "blog_games" ("id") DEFERRABLE INITIALLY DEFERRED,
                "CategoryName_id" bigint NOT NULL REFERENCES "blog_itemscategories" ("id") DEFERRABLE INITIALLY DEFERRED,
                "SubCategoryName_id" bigint NOT NULL REFERENCES "blog_itemssubcategories" ("id") DEFERRABLE INITIALLY DEFERRED,
                "Unique_token" varchar(36) NOT NULL,
                "icon" varchar(200) NULL
            )
            """
        )
        cursor.execute(
            """
            INSERT INTO "blog_items_new" (
                "id", "ItemName", "x_location", "y_location", "GameName_id",
                "CategoryName_id", "SubCategoryName_id", "Unique_token", "icon"
            )
            SELECT i."id", i."ItemName", i."x_location", i."y_location", g."id",
                   i."CategoryName_id", i."SubCategoryName_id", i."Unique_token", i."icon"
            FROM "blog_items" i
            INNER JOIN "blog_games" g ON g."name" = i."GameName_id"
            """
        )
        cursor.execute('DROP TABLE "blog_items"')
        cursor.execute('ALTER TABLE "blog_items_new" RENAME TO "blog_items"')
        cursor.execute(
            'CREATE INDEX "blog_items_CategoryName_id_06d1241e" '
            'ON "blog_items" ("CategoryName_id")'
        )
        cursor.execute(
            'CREATE INDEX "blog_items_GameName_id_6ae8dea2" '
            'ON "blog_items" ("GameName_id")'
        )
        cursor.execute(
            'CREATE INDEX "blog_items_SubCategoryName_id_1e0bce3a" '
            'ON "blog_items" ("SubCategoryName_id")'
        )
        _restore_sequence(cursor, "blog_items")

        cursor.execute("PRAGMA foreign_keys = ON")


def unremap_games_primary_key(apps, schema_editor):
    if schema_editor.connection.vendor != "sqlite":
        raise NotImplementedError("Games PK remap is written for SQLite only")

    with schema_editor.connection.cursor() as cursor:
        if "id" not in _table_columns(cursor, "blog_games"):
            return

        cursor.execute("PRAGMA foreign_keys = OFF")

        cursor.execute(
            """
            CREATE TABLE "blog_itemscategories_new" (
                "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT,
                "CategoryName" varchar(100) NOT NULL,
                "GameName_id" varchar(100) NOT NULL REFERENCES "blog_games" ("name") DEFERRABLE INITIALLY DEFERRED,
                CONSTRAINT "unique_category_per_game" UNIQUE ("CategoryName", "GameName_id")
            )
            """
        )
        cursor.execute(
            """
            INSERT INTO "blog_itemscategories_new" ("id", "CategoryName", "GameName_id")
            SELECT c."id", c."CategoryName", g."name"
            FROM "blog_itemscategories" c
            INNER JOIN "blog_games" g ON g."id" = c."GameName_id"
            """
        )
        cursor.execute('DROP TABLE "blog_itemscategories"')
        cursor.execute(
            'ALTER TABLE "blog_itemscategories_new" RENAME TO "blog_itemscategories"'
        )
        cursor.execute(
            'CREATE INDEX "blog_itemscategories_GameName_id_364abda7" '
            'ON "blog_itemscategories" ("GameName_id")'
        )
        _restore_sequence(cursor, "blog_itemscategories")

        cursor.execute(
            """
            CREATE TABLE "blog_itemssubcategories_new" (
                "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT,
                "SubCategoryName" varchar(100) NOT NULL,
                "GameName_id" varchar(100) NOT NULL REFERENCES "blog_games" ("name") DEFERRABLE INITIALLY DEFERRED,
                "PrimalCategory_id" bigint NOT NULL REFERENCES "blog_itemscategories" ("id") DEFERRABLE INITIALLY DEFERRED,
                "Default_icon" varchar(200) NULL,
                CONSTRAINT "unique_subcategory_per_game" UNIQUE ("SubCategoryName", "GameName_id", "PrimalCategory_id")
            )
            """
        )
        cursor.execute(
            """
            INSERT INTO "blog_itemssubcategories_new"
                ("id", "SubCategoryName", "GameName_id", "PrimalCategory_id", "Default_icon")
            SELECT s."id", s."SubCategoryName", g."name", s."PrimalCategory_id", s."Default_icon"
            FROM "blog_itemssubcategories" s
            INNER JOIN "blog_games" g ON g."id" = s."GameName_id"
            """
        )
        cursor.execute('DROP TABLE "blog_itemssubcategories"')
        cursor.execute(
            'ALTER TABLE "blog_itemssubcategories_new" RENAME TO "blog_itemssubcategories"'
        )
        cursor.execute(
            'CREATE INDEX "blog_itemssubcategories_GameName_id_5f4d5331" '
            'ON "blog_itemssubcategories" ("GameName_id")'
        )
        cursor.execute(
            'CREATE INDEX "blog_itemssubcategories_PrimalCategory_id_8b87e301" '
            'ON "blog_itemssubcategories" ("PrimalCategory_id")'
        )
        _restore_sequence(cursor, "blog_itemssubcategories")

        cursor.execute(
            """
            CREATE TABLE "blog_gamemaps_new" (
                "Map_name" varchar(100) NOT NULL PRIMARY KEY,
                "image_path" varchar(200) NOT NULL,
                "width" integer NOT NULL,
                "height" integer NOT NULL,
                "GameName_id" varchar(100) NOT NULL REFERENCES "blog_games" ("name") DEFERRABLE INITIALLY DEFERRED,
                "coordinates_feature" bool NOT NULL,
                "origin_x" real NULL,
                "origin_y" real NULL,
                "pixels_per_unit" real NULL
            )
            """
        )
        cursor.execute(
            """
            INSERT INTO "blog_gamemaps_new" (
                "Map_name", "image_path", "width", "height", "GameName_id",
                "coordinates_feature", "origin_x", "origin_y", "pixels_per_unit"
            )
            SELECT m."Map_name", m."image_path", m."width", m."height", g."name",
                   m."coordinates_feature", m."origin_x", m."origin_y", m."pixels_per_unit"
            FROM "blog_gamemaps" m
            INNER JOIN "blog_games" g ON g."id" = m."GameName_id"
            """
        )
        cursor.execute('DROP TABLE "blog_gamemaps"')
        cursor.execute('ALTER TABLE "blog_gamemaps_new" RENAME TO "blog_gamemaps"')
        cursor.execute(
            'CREATE INDEX "blog_gamemaps_GameName_id_3600cf96" '
            'ON "blog_gamemaps" ("GameName_id")'
        )

        cursor.execute(
            """
            CREATE TABLE "blog_items_new" (
                "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT,
                "ItemName" varchar(100) NOT NULL,
                "x_location" integer NOT NULL,
                "y_location" integer NOT NULL,
                "GameName_id" varchar(100) NOT NULL REFERENCES "blog_games" ("name") DEFERRABLE INITIALLY DEFERRED,
                "CategoryName_id" bigint NOT NULL REFERENCES "blog_itemscategories" ("id") DEFERRABLE INITIALLY DEFERRED,
                "SubCategoryName_id" bigint NOT NULL REFERENCES "blog_itemssubcategories" ("id") DEFERRABLE INITIALLY DEFERRED,
                "Unique_token" varchar(36) NOT NULL,
                "icon" varchar(200) NULL
            )
            """
        )
        cursor.execute(
            """
            INSERT INTO "blog_items_new" (
                "id", "ItemName", "x_location", "y_location", "GameName_id",
                "CategoryName_id", "SubCategoryName_id", "Unique_token", "icon"
            )
            SELECT i."id", i."ItemName", i."x_location", i."y_location", g."name",
                   i."CategoryName_id", i."SubCategoryName_id", i."Unique_token", i."icon"
            FROM "blog_items" i
            INNER JOIN "blog_games" g ON g."id" = i."GameName_id"
            """
        )
        cursor.execute('DROP TABLE "blog_items"')
        cursor.execute('ALTER TABLE "blog_items_new" RENAME TO "blog_items"')
        cursor.execute(
            'CREATE INDEX "blog_items_CategoryName_id_06d1241e" '
            'ON "blog_items" ("CategoryName_id")'
        )
        cursor.execute(
            'CREATE INDEX "blog_items_GameName_id_6ae8dea2" '
            'ON "blog_items" ("GameName_id")'
        )
        cursor.execute(
            'CREATE INDEX "blog_items_SubCategoryName_id_1e0bce3a" '
            'ON "blog_items" ("SubCategoryName_id")'
        )
        _restore_sequence(cursor, "blog_items")

        cursor.execute(
            """
            CREATE TABLE "blog_games_new" (
                "name" varchar(100) NOT NULL PRIMARY KEY,
                "public" bool NOT NULL
            )
            """
        )
        cursor.execute(
            'INSERT INTO "blog_games_new" ("name", "public") '
            'SELECT "name", "public" FROM "blog_games"'
        )
        cursor.execute('DROP TABLE "blog_games"')
        cursor.execute('ALTER TABLE "blog_games_new" RENAME TO "blog_games"')

        cursor.execute("PRAGMA foreign_keys = ON")


class Migration(migrations.Migration):
    atomic = False

    dependencies = [
        ("blog", "0008_alter_items_icon"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(
                    remap_games_primary_key,
                    unremap_games_primary_key,
                ),
            ],
            state_operations=[
                migrations.AlterField(
                    model_name="games",
                    name="name",
                    field=models.CharField(max_length=100, unique=True),
                ),
                migrations.AddField(
                    model_name="games",
                    name="id",
                    field=models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
            ],
        ),
    ]
