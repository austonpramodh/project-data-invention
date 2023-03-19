import { CacheMap, Prisma, PrismaClient } from "@prisma/client";
import axios from "axios";
import axiosRetry from "axios-retry";

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
            project_id: true,
            project_slug: true,
            board_id: true,
        },
    });

    let discussion_title = "";

    // Exponential back-off retry delay between requests
    console.log("Enabling Axios retry!!");
    axiosRetry(axios, {
        retryDelay: axiosRetry.exponentialDelay,
        retries: 300,
        retryCondition: (err) => {
            console.log("Error: ", err.code, err.name, err.message);

            return true;
        },
        onRetry: (retryCount) => {
            console.log(`Retrying request for discussion "${discussion_title}" (Retry Count: ${retryCount})`);
        },
    });


    let allCache: Record<string, CacheMap> = await prismaClient.cacheMap.findMany().then((cacheFromDB) => {
        return cacheFromDB.reduce((acc, curr) => {
            acc[curr.key] = curr;
            return acc;
        }, {} as Record<string, CacheMap>);
    });


    const findCacheObj = async (key: string) => {
        // try to find the cache from the allCache array
        const cache = allCache[key]
        if (cache) {
            return cache;
        }

        // If not found, fetch all the cache from the database and update the allCache array
        const cacheFromDB = await prismaClient.cacheMap.findFirst({
            where: {
                key,
            },
        });

        if (cacheFromDB) {
            allCache[key] = cacheFromDB;
        }

        // Now this cache should be found in the allCache array, if not, return undefined
        return allCache[key];
    }

    // For each discussion, get the comments data from the comments api :- https://talk.zooniverse.org/comments?http_cache=true&discussion_id=2820616&page_size=20&page=1
    // Create a comment in the database for each comment in the comments data
    for (let i = 0; i < discussions.length; i++) {
        const discussion = discussions[i];

        console.log("Importing comments for discussion: ", discussion.title, ` (${i + 1} of ${discussions.length})`);
        // Loop through the comments pages
        let page = 1;
        let hasNextPage = true;
        
        while (hasNextPage) {
            discussion_title = discussion.title || "";

            const getApiurl = (pageNum: number, zooniverse_id: string) =>
                `https://talk.zooniverse.org/comments?http_cache=true&discussion_id=${zooniverse_id}&page_size=50&page=${pageNum}`;
            let apiurl = getApiurl(page, discussion.zooniverse_id || "");
            // Check if we have already tried to fetch comments for this discussion
            const discussionExists = await findCacheObj(apiurl);

            if (discussionExists) {
                consoleLog(`This page(${page}) for discussion "${discussion.title}" was already fetched`);
                // Since thie page was already fetched, we can skip the rest of the pages until we find a page that was not fetched
                const exitingDiscussion = JSON.parse(discussionExists.value) as CommentsAPIResponse["meta"]["comments"];
                const totalPages = exitingDiscussion.page_count;

                consoleLog(
                    `Total pages for discussion "${discussion.title}" is ${totalPages} and current page is ${page}`,
                );

                if (page === totalPages) {
                    consoleLog(`All comments for discussion "${discussion.title}" already exist in DB`);
                    break;
                }

                // check if the last page was already fetched
                const lastPageApiurl = getApiurl(totalPages, discussion.zooniverse_id || "");
                const lastPageDiscussionExists = await findCacheObj(lastPageApiurl);

                // Since last page was already fetched, we can skip the rest of the pages
                if (lastPageDiscussionExists) {
                    consoleLog(`All comments for discussion "${discussion.title}" already exist in DB`);
                    break;
                }

                // Since last page was not fetched, we can skip to the last page that was fetched
                for (let j = page + 1; j <= totalPages; j++) {
                    consoleLog(`Checking if page ${j} for discussion "${discussion.title}" was already fetched`);
                    const jApiurl = getApiurl(j, discussion.zooniverse_id || "");
                    const discussionExists = await findCacheObj(jApiurl);

                    if (!discussionExists) {
                        page = j;
                        // Page number has been updated, so update the apiurl
                        apiurl = getApiurl(page, discussion.zooniverse_id || "");
                        consoleLog(`Skipping to page ${page} for discussion "${discussion.title}"`);
                        break;
                    }
                }
            }

            // Rate limit the requests to the API
            await delay(50);

            // Get the comments data from the comments api
            const commentsData = await axios.get<CommentsAPIResponse>(apiurl);

            const commentsDataJSON = commentsData.data;

            // Check if discussions has been deleted, since the last time we fetched the discussions data
            // if so, delete the discussion from the database and comments from the database for that discussion and skip to the next discussion
            // delete the cache map for the discussion too
            if (commentsDataJSON.meta.comments.count === 0) {
                consoleLog(`Discussion "${discussion.title}" has been deleted, deleting discussion and comments from DB`);

                await prismaClient.comment.deleteMany({
                    where: {
                        discussion_id: discussion.zooniverse_id,
                    },
                });

                await prismaClient.discussion.delete({
                    where: {
                        id: discussion.id,
                    },
                });

                await prismaClient.cacheMap.deleteMany({
                    where: {
                        key: {
                            contains: `comments?http_cache=true&discussion_id=${discussion.zooniverse_id}`,
                        },
                    },
                });

                break;
            }

            // Check if all the comments have already been feteched
            const commentsCount = await prismaClient.comment.count({
                where: {
                    discussion_id: discussion.zooniverse_id,
                },
            });


            // Legacy code to handle the case where the comments api was not cached, if it was cached, then this code will never run
            if (commentsCount >= commentsDataJSON.meta.comments.count) {
                consoleLog(`All comments for discussion "${discussion.title}" already exist in DB ${page}`);

                // FIXME: This code should not be needed, since the above code anyways checks if the comments have already been fetched, but for some reason, the above code is not working
                const exists = await prismaClient.cacheMap.findFirst({
                    where: {
                        key: apiurl,
                    },
                });
                if(!exists)
                // Since we didnt have the cacheMap entry for this page, we need to add it now
                await prismaClient.cacheMap.create({
                    data: {
                        key: apiurl,
                        value: JSON.stringify({
                            page: commentsDataJSON.meta.comments.page,
                            page_size: commentsDataJSON.meta.comments.page_size,
                            count: commentsDataJSON.meta.comments.count,
                            page_count: commentsDataJSON.meta.comments.page_count,
                            previous_page: commentsDataJSON.meta.comments.previous_page,
                            next_page: commentsDataJSON.meta.comments.next_page,
                        }),
                    },
                });
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

            const exists = await prismaClient.cacheMap.findFirst({
                where: {
                    key: apiurl,
                },
            });

            // FIXME: This code should not be needed, since the above code anyways checks if the comments have already been fetched, but for some reason, the above code is not working
            if (exists) {
                consoleLog(`CacheMap entry for page ${page} already exists`);
                continue;
            } else {
                consoleLog(`CacheMap entry for page ${page} does not exist`);
            }
            // Cache the discussion
            await prismaClient.cacheMap.create({
                data: {
                    key: apiurl,
                    value: JSON.stringify({
                        page: commentsDataJSON.meta.comments.page,
                        page_size: commentsDataJSON.meta.comments.page_size,
                        count: commentsDataJSON.meta.comments.count,
                        page_count: commentsDataJSON.meta.comments.page_count,
                        previous_page: commentsDataJSON.meta.comments.previous_page,
                        next_page: commentsDataJSON.meta.comments.next_page,
                    }),
                },
            });
        }
    }
}

// Page 1 of 1 for discussion Subject 37656730, Discussions: 55680 of 261490