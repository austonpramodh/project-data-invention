-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "zooniverse_id" TEXT NOT NULL,
    "display_name" TEXT,
    "classifications_count" INTEGER,
    "updated_at" DATETIME,
    "description" TEXT,
    "slug" TEXT,
    "redirect" TEXT,
    "launch_approved" BOOLEAN,
    "completeness" REAL,
    "state" TEXT,
    "avatar_src" TEXT,
    "links" TEXT
);
