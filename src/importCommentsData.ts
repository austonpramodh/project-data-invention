import { PrismaClient } from "@prisma/client";
import axios from 'axios';

import { delay } from "./utils";

interface CommentsAPIResponse {
    comments: {
        id: string;
        href: string;
        links: Record<string, string>;
        created_at: string;
        discussion_id: string;
        discussion_comments_count: number;
        board_id: string;
        board_comments_count: number;
        board_description: string;
        board_discussions_count: number;
        board_parent_id: string;
        board_subject_default: boolean;
        board_title: string;
        board_users_count: number;
        project_id: string;
        project_slug: string;
        project_title: string;
        user_id: string;
        user_login: string;
        user_display_name: string;
        body: string;
        category: string;
    }[];
    meta: {
        comments: {
            page: number;
            page_size: number;
            count: number;
            include: string[];
            page_count: number;
            previous_page: number;
            next_page: number;
            first_href: string;
            previous_href: string;
            next_href: string;
            last_href: string;
            current_sort: string;
            default_sort: string;
            sortable_attributes: string[];
        };
    };
}

export async function importCommentsDataIntoDB(prismaClient: PrismaClient, seedMode = false): Promise<void> {
    const consoleLog = (...args: any[]): any => !seedMode && console.log(...args);

    // Get the all discussions from the database
    const discussions = await prismaClient.discussion.findMany({
        select: {
            id: true,
            zooniverse_id: true,
            title: true,
        },
    });

    // For each discussion, get the comments data from the comments api :- https://talk.zooniverse.org/comments?http_cache=true&discussion_id=2820616&page_size=20&page=1
    // Create a comment in the database for each comment in the comments data
    for (let i = 0; i < discussions.length; i++) {
        const discussion = discussions[i];

        console.log("Importing comments for discussion: ", discussion.title, ` (${i + 1} of ${discussions.length})`);
        // Loop through the comments pages
        let page = 1;
        let hasNextPage = true;

        while (hasNextPage) {
            // Rate limit the requests to the API
            await delay(100);

            // Get the comments data from the comments api
            const commentsData = await axios.get<CommentsAPIResponse>(`https://talk.zooniverse.org/comments?http_cache=true&discussion_id=${discussion.zooniverse_id}&page_size=10&page=${page}`);

            const commentsDataJSON = commentsData.data;

            // Check if all the comments have already been feteched
            const commentsCount = await prismaClient.comment.count({
                where: {
                    discussion_id: discussion.zooniverse_id,
                },
            });

            if (commentsCount >= commentsDataJSON.meta.comments.count) {
                consoleLog(`All comments for discussion "${discussion.title}" already exist in DB`);
                break;
            }

            // Create a comment in the database for each comment in the comments data
            for (const comment of commentsDataJSON.comments) {
                try {
                    const commentExists = await prismaClient.comment.findFirst({
                        where: {
                            zooniverse_id: comment.id,
                        },
                    });

                    if (commentExists) {
                        consoleLog(`Comment "${comment.id}" already exists in DB`);
                        continue;
                    }

                    await prismaClient.comment.create({
                        data: {
                            zooniverse_id: comment.id,
                            body: comment.body,
                            category: comment.category,
                            created_at: comment.created_at,
                            board_comments_count: comment.board_comments_count,
                            board_description: comment.board_description,
                            board_discussions_count: comment.board_discussions_count,
                            board_parent_id: comment.board_parent_id,
                            board_subject_default: comment.board_subject_default,
                            board_title: comment.board_title,
                            board_users_count: comment.board_users_count,
                            project_id: comment.project_id,
                            project_slug: comment.project_slug,
                            project_title: comment.project_title,
                            user_id: comment.user_id,
                            user_login: comment.user_login,
                            user_display_name: comment.user_display_name,
                            board_id: comment.board_id,
                            discussion_id: comment.discussion_id,
                            discussion_comments_count: comment.discussion_comments_count,
                            href: comment.href,
                            links: JSON.stringify(comment.links),
                        },
                    });
                } catch (error) {
                    console.error(error);
                }
            }

            // Check if there is another page of comments
            hasNextPage = commentsDataJSON.meta.comments.next_page !== null;
            page = commentsDataJSON.meta.comments.next_page ?? 1;

            consoleLog(
                `Page ${page} of ${commentsDataJSON.meta.comments.page_count} for discussion ${
                    discussion.title
                }, Discussions: ${i + 1} of ${discussions.length}`,
            );
        }
    }
}
