-- CreateTable
CREATE TABLE "PopularTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "zooniverse_id" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "project_id" INTEGER NOT NULL,
    "section" TEXT NOT NULL,
    "usages" INTEGER NOT NULL
);
