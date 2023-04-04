import { PrismaClient } from "@prisma/client";

import { exportDataFromDBToCSV } from "./exportDataFromDBToCSV";
import { importBoardsDataIntoDB } from "./importBoardsData";
import { importCommentsDataIntoDB } from "./importCommentsData";
import { importDiscussionsDataIntoDB } from "./importDiscussionsData";
import { importPopularTagsDataIntoDB } from "./importPopularTags";
import { importProjectsDataIntoDB } from "./importProjectsData";

const prisma = new PrismaClient();

async function main() {
    // Seed the database with projects data
    //  await importProjectsDataIntoDB(prisma);
    // Import the boards data into the database
    // await importBoardsDataIntoDB(prisma);
    // Import the discussions data into the database
    // await importDiscussionsDataIntoDB(prisma);
    // Import the comments data into the database
    // await importCommentsDataIntoDB(prisma);

    // Import the popular tags data into the database
    // await importPopularTagsDataIntoDB(prisma);

    // Publish all the data from the database to csv file
    await exportDataFromDBToCSV(prisma);
}

main();
