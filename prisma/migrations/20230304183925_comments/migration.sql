-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "zooniverse_id" TEXT,
    "href" TEXT,
    "links" TEXT,
    "created_at" DATETIME,
    "discussion_id" TEXT,
    "discussion_comments_count" INTEGER,
    "board_id" TEXT,
    "board_comments_count" INTEGER,
    "board_description" TEXT,
    "board_discussions_count" INTEGER,
    "board_parent_id" TEXT,
    "board_subject_default" BOOLEAN,
    "board_title" TEXT,
    "board_users_count" INTEGER,
    "project_id" TEXT,
    "project_slug" TEXT,
    "project_title" TEXT,
    "user_id" TEXT,
    "user_login" TEXT,
    "user_display_name" TEXT,
    "body" TEXT,
    "category" TEXT
);
