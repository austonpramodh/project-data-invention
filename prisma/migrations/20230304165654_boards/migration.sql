-- CreateTable
CREATE TABLE "Board" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "zooniverse_id" TEXT,
    "href" TEXT,
    "links" TEXT,
    "comments_count" INTEGER,
    "created_at" DATETIME,
    "description" TEXT,
    "discussions_count" INTEGER,
    "last_comment_created_at" DATETIME,
    "parent_id" TEXT,
    "position" INTEGER,
    "section" TEXT,
    "subject_default" BOOLEAN,
    "title" TEXT,
    "users_count" INTEGER,
    "project_id" TEXT
);
