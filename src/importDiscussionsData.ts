import { PrismaClient } from "@prisma/client";

import { delay } from "./utils";

export interface Discussion {
    href: string;
    board_id: string;
    comments_count: number;
    created_at: Date;
    focus_id: string;
    id: string;
    last_comment_created_at: string;
    locked: boolean;
    project_id: string;
    section: string;
    sticky: boolean;
    subject_default: boolean;
    title: string;
    updated_at: Date;
    user_id: string;
    user_login: string;
    users_count: number;
    project_slug: string;
    project_title: string;
    board_comments_count: number;
    board_description: string;
    board_discussions_count: number;
    board_parent_id: string;
    board_subject_default: boolean;
    board_title: string;
    board_users_count: number;
    user_display_name: string;
}

interface DiscussionsAPIResponse {
    discussions: Discussion[];
    meta: {
        discussions: {
            page: number;
            page_size: number;
            count: number;
            include: string[];
            page_count: number;
            previous_page: null;
            next_page: null;
            first_href: string;
            previous_href: null;
            next_href: null;
            last_href: string;
            current_sort: string;
            default_sort: string;
            sortable_attributes: string[];
        };
    };
}

export async function importDiscussionsDataIntoDB(prismaClient: PrismaClient, seedMode = false): Promise<void> {
    const consoleLog = (...args: any[]): any => !seedMode && console.log(...args);

    // Get the boards from the database
    const boards = await prismaClient.board.findMany();

    // For each board, get the discussions data from the discussions api :- https://talk.zooniverse.org/boards/1?http_cache=true&page_size=20
    // Create a discussion in the database for each discussion in the discussions data
    for (let i = 0; i < boards.length; i++) {
        const board = boards[i];

        console.log("Importing discussions for board: ", board.title, ` (${i + 1} of ${boards.length})`);

        // Loop through the discussions pages
        let page = 1;
        let hasNextPage = true;

        while (hasNextPage) {
            // Get the discussions data from the discussions api
            const discussionsData = await fetch(
                `https://talk.zooniverse.org/discussions?http_cache=true&board_id=${board.zooniverse_id}&page_size=50&page=${page}`,
            );

            // Rate limit the requests to the API
            await delay(50);

            const discussionsDataJSON = (await discussionsData.json()) as DiscussionsAPIResponse;

            // Check for total discussions count, and see if we have all the discussions in the database
            const totalDiscussionsCount = discussionsDataJSON.meta.discussions.count;
            const discussionsInDBCount = await prismaClient.discussion.count({
                where: {
                    board_id: board.zooniverse_id,
                },
            });

            if (discussionsInDBCount >= totalDiscussionsCount) {
                consoleLog(`All discussions for board "${board.title}" already exist in DB`);
                break;
            }

            // Create a discussion in the database for each discussion in the discussions data
            for (const discussion of discussionsDataJSON.discussions) {
                try {
                    const discussionExists = await prismaClient.discussion.findFirst({
                        where: {
                            zooniverse_id: discussion.id,
                        },
                    });

                    if (discussionExists) {
                        consoleLog(`Discussion "${discussion.title}" already exists in DB`);
                        continue;
                    }

                    await prismaClient.discussion.create({
                        data: {
                            zooniverse_id: discussion.id,
                            title: discussion.title,
                            href: discussion.href,
                            created_at: discussion.created_at,
                            updated_at: discussion.updated_at,
                            last_comment_created_at: discussion.last_comment_created_at,
                            comments_count: discussion.comments_count,
                            users_count: discussion.users_count,
                            board_id: discussion.board_id,
                            user_id: discussion.user_id,
                            project_id: discussion.project_id,
                            focus_id: discussion.focus_id,
                            section: discussion.section,
                            locked: discussion.locked,
                            sticky: discussion.sticky,
                            subject_default: discussion.subject_default,
                            board_comments_count: discussion.board_comments_count,
                            board_description: discussion.board_description,
                            board_discussions_count: discussion.board_discussions_count,
                            board_parent_id: discussion.board_parent_id,
                            board_subject_default: discussion.board_subject_default,
                            board_title: discussion.board_title,
                            board_users_count: discussion.board_users_count,
                            user_display_name: discussion.user_display_name,
                            user_login: discussion.user_login,
                            project_slug: discussion.project_slug,
                            project_title: discussion.project_title,
                        },
                    });

                    consoleLog(`Imported discussion "${discussion.title}"`);
                } catch (error) {
                    console.error(`Error importing discussion "${discussion.title}"`);
                    console.error(error);
                }
            }

            // Check if there is a next page
            hasNextPage = discussionsDataJSON.meta.discussions.next_page !== null;
            page = discussionsDataJSON.meta.discussions.next_page ?? 1;

            consoleLog(
                `Page ${page} of ${discussionsDataJSON.meta.discussions.page_count} for board: ${
                    board.title
                }, Boards: ${i + 1} of ${boards.length}`,
            );
        }
    }
}

// Get the count of discussions in the database
// Select count(*) from discussions;
