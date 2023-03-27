// This will import the popular tags for each projects boards into the database
import { PrismaClient } from "@prisma/client";
import axios from "axios";

import { delay } from "./utils";

interface PopularTag {
    href: string;
    id: string;
    name: string;
    project_id: number;
    section: string;
    usages: number;
}

interface PopularTagsAPIResponse {
    popular: PopularTag[];
    meta: {
        popular: {
            page: number;
            page_size: number;
            count: number;
            include: string[];
            page_count: number;
            previous_page: null;
            next_page: number;
            first_href: string;
            previous_href: null;
            next_href: string;
            last_href: string;
            current_sort: string;
            default_sort: null;
            sortable_attributes: string[];
        };
    };
}

// Get the popular tags for each project
export async function importPopularTagsDataIntoDB(prismaClient: PrismaClient, seedMode = false): Promise<void> {
    const consoleLog = (...args: any[]): any => !seedMode && console.log(...args);

    // Get the boards from the database
    const projects = await prismaClient.project.findMany();

    // Get the popular tags for each board
    for (let i = 0; i < projects.length; i++) {
        const project = projects[i];

        console.log("Importing popular tags for project: ", project.display_name, ` (${i + 1} of ${projects.length})`);
        const getAPIUrl = () =>
            `https://talk.zooniverse.org/tags/popular?http_cache=true&section=project-${
                project.zooniverse_id
            }&limit=${20}&page_size=${20}`;

        const url = getAPIUrl();
        // const cacheKeyExists = await prismaClient.cacheMap.findFirst({
        //     where: {
        //         key: url,
        //     },
        // });

        // if (cacheKeyExists) {
        //     consoleLog("Popular tags already exist in the database for project: ", project.display_name);
        //     continue;
        // }

        const popularTagsData = await axios.get<PopularTagsAPIResponse>(url);

        // Rate limit the requests to the API
        await delay(50);

        // Create a popular tag in the database for each popular tag in the popular tags data
        for (let j = 0; j < popularTagsData.data.popular.length; j++) {
            const popularTag = popularTagsData.data.popular[j];

            // Check if the popular tag already exists in the database
            const popularTagExists = await prismaClient.popularTag.findFirst({
                where: {
                    zooniverse_id: popularTag.id,
                },
            });

            if (popularTagExists) {
                consoleLog("Popular tag already exists in the database: ", popularTag.name);
                continue;
            }

            await prismaClient.popularTag.create({
                data: {
                    name: popularTag.name,
                    href: popularTag.href,
                    zooniverse_id: popularTag.id,
                    usages: popularTag.usages,
                    section: popularTag.section,
                    project_id: popularTag.project_id,
                },
            });

            consoleLog("Created popular tag: ", popularTag.name);

            // Set a cache key for the popular tags
            // await prismaClient.cacheMap.create({
            //     data: {
            //         key: getAPIUrl(),
            //         value: JSON.stringify(true),
            //     },
            // });
        }
    }
}
