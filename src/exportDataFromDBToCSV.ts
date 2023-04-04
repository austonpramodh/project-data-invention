import fs from "fs";

import { PrismaClient } from "@prisma/client";
import csv from "csv";

const csvStringifyPromise = (data: any[]): Promise<string> =>
    new Promise((resolve, reject) => {
        csv.stringify(data, { header: true }, (err, output) => {
            if (err) {
                return reject(err);
            }

            resolve(output);
        });
    });

export async function exportDataFromDBToCSV(prismaClient: PrismaClient, seedMode = false): Promise<void> {
    const consoleLog = (...args: any[]): any => !seedMode && console.log(...args);

    const ExportsDirectory = "exports";

    // delete file if it exists
    const projectsFilePath = `${ExportsDirectory}/projects.csv`;

    if (!fs.existsSync(projectsFilePath)) {
        consoleLog("Writing to projects.csv");
        // Read the csv file using csv file
        const projectsWriteableStream = fs.createWriteStream(projectsFilePath, { flags: "a" });

        // Export the projects data from the database to csv file
        // Get the projects data from the database
        const projects = await prismaClient.project.findMany();
        const projectsCSV = await csvStringifyPromise(projects);

        projectsWriteableStream.write(projectsCSV);

        projectsWriteableStream.close();
    } else {
        consoleLog(`${projectsFilePath} already exists`);
    }

    const boardsFilePath = `${ExportsDirectory}/boards.csv`;

    if (!fs.existsSync(boardsFilePath)) {
        consoleLog("Writing to boards.csv");
        // Read the csv file using csv file
        const boardsWriteableStream = fs.createWriteStream(boardsFilePath, { flags: "a" });

        // Export the boards data from the database to csv file
        // Get the boards data from the database
        const boards = await prismaClient.board.findMany();

        // Remove "\n" from the description for every board
        consoleLog("Removing \\n from the description for every board");
        boards.forEach((board) => {
            board.description = board.description?.replace(/\n/g, "") ?? "";
        });

        const boardsCSV = await csvStringifyPromise(boards);

        boardsWriteableStream.write(boardsCSV);

        boardsWriteableStream.close();
    } else {
        consoleLog(`${boardsFilePath} already exists`);
    }

    const discussionsFilePath = `${ExportsDirectory}/discussions.csv`;

    if (!fs.existsSync(discussionsFilePath)) {
        consoleLog("Writing to discussions.csv");
        // Read the csv file using csv file
        const discussionsWriteableStream = fs.createWriteStream(discussionsFilePath, { flags: "a" });

        // Export the discussions data from the database to csv file
        // Get the discussions data from the database
        const discussions = await prismaClient.discussion.findMany();

        // Remove "\n" from the description for every discussion
        consoleLog("Removing \\n from the description for every discussion");
        discussions.forEach((discussion) => {
            // discussion.description = discussion.description?.replace(/\n/g, "") ?? "";
            discussion.board_description = discussion.board_description?.replace(/\n/g, "") ?? "";
        });

        const discussionsCSV = await csvStringifyPromise(discussions);

        discussionsWriteableStream.write(discussionsCSV);

        discussionsWriteableStream.close();
    } else {
        consoleLog(`${discussionsFilePath} already exists`);
    }

    const commentsFilePath = `${ExportsDirectory}/comments.csv`;

    if (!fs.existsSync(commentsFilePath)) {
        consoleLog("Writing to comments.csv");
        // Read the csv file using csv file
        const commentsWriteableStream = fs.createWriteStream(commentsFilePath, { flags: "a" });

        // Export the comments data from the database to csv file
        // Get the comments data from the database
        const comments = await prismaClient.comment.findMany();

        // Remove "\n" from the description for every comment
        consoleLog("Removing \\n from the description for every comment");

        comments.forEach((comment) => {
            comment.board_description = comment.board_description?.replace(/\n/g, "") ?? "";
            comment.body = comment.body?.replace(/\n/g, "") ?? "";
        });

        const commentsCSV = await csvStringifyPromise(comments);

        commentsWriteableStream.write(commentsCSV);

        commentsWriteableStream.close();
    } else {
        consoleLog(`${commentsFilePath} already exists`);
    }

    const popularTagsFilePath = `${ExportsDirectory}/popularTags.csv`;

    if (!fs.existsSync(popularTagsFilePath)) {
        consoleLog("Writing to popularTags.csv");
        // Read the csv file using csv file
        const popularTagsWriteableStream = fs.createWriteStream(popularTagsFilePath, { flags: "a" });

        // Export the popular tags data from the database to csv file
        // Get the popular tags data from the database
        const popularTags = await prismaClient.popularTag.findMany();

        const popularTagsCSV = await csvStringifyPromise(popularTags);

        popularTagsWriteableStream.write(popularTagsCSV);

        popularTagsWriteableStream.close();
    } else {
        consoleLog(`${popularTagsFilePath} already exists`);
    }

    consoleLog("Exporting data from the database to csv file");
}
