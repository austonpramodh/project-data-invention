import { PrismaClient } from "@prisma/client";

import { delay } from "./utils";

interface BoardsAPIResponse {
    boards: {
        id: string;
        href: string;
        links: Record<string, string>;
        comments_count: number;
        created_at: string;
        description: string;
        discussions_count: number;
        last_comment_created_at: string;
        parent_id: string;
        position: number;
        project_id: string;
        section: string;
        subject_default: boolean;
        title: string;
        users_count: number;
    }[];
    meta: {
        boards: {
            page: number;
            page_size: number;
            count: number;
            page_count: number;
            previous_page: number | null;
            next_page: number | null;
        };
    };
}

export async function importBoardsDataIntoDB(prismaClient: PrismaClient): Promise<void> {
    // Get the projects from the database
    const projects = await prismaClient.project.findMany();

    // For each project, get the boards data from the boards api :- https://talk.zooniverse.org/boards?http_cache=true&section=project-10869&page_size=20
    // Create a board in the database for each board in the boards data
    for (const project of projects) {
        console.log("Importing boards for project: ", project.display_name);

        let page = 1;
        let hasNextPage = true;

        while (hasNextPage) {
            // Wait 100ms to avoid rate limiting
            await delay(100);

            // Get the boards data from the boards api
            const boardsData = await fetch(
                `https://talk.zooniverse.org/boards?http_cache=true&section=project-${project.zooniverse_id}&page_size=20&page=${page}`,
            );
            const boardsDataJSON = (await boardsData.json()) as BoardsAPIResponse;

            // Create a board in the database for each board in the boards data
            for (const board of boardsDataJSON.boards) {
                try {
                    const boardExists = await prismaClient.board.findFirst({
                        where: {
                            zooniverse_id: board.id,
                        },
                    });

                    if (boardExists) {
                        console.log(`Board "${board.title}" already exists in DB`);
                        continue;
                    }

                    await prismaClient.board.create({
                        data: {
                            zooniverse_id: board.id,
                            title: board.title,
                            description: board.description,
                            position: board.position,
                            section: board.section,
                            subject_default: board.subject_default,
                            users_count: board.users_count,
                            comments_count: board.comments_count,
                            last_comment_created_at: board.last_comment_created_at,
                            created_at: board.created_at,
                            project_id: board.project_id,
                            parent_id: board.parent_id,
                            discussions_count: board.discussions_count,
                            links: JSON.stringify(board.links),
                            href: board.href,
                        },
                    });

                    console.log(`Imported board "${board.title}"`);
                } catch (error) {
                    console.error(`Error importing board "${board.title}"`);
                    console.error(error);
                }
            }

            // Check if there is a next page
            hasNextPage = boardsDataJSON.meta.boards.next_page !== null;
            page = boardsDataJSON.meta.boards.next_page ?? 1;

            console.log(
                `Imported boards page ${page - 1} of ${boardsDataJSON.meta.boards.page_count} for project: ${
                    project.display_name
                }`,
            );
        }
    }
}
