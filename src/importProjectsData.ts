import { PrismaClient } from "@prisma/client";

// Pages data
import page1 from "./projects-data/page1.json";
import page2 from "./projects-data/page2.json";
import page3 from "./projects-data/page3.json";
import page4 from "./projects-data/page4.json";
import page5 from "./projects-data/page5.json";
import page6 from "./projects-data/page6.json";
import { delay } from "./utils";

const pages = [page1, page2, page3, page4, page5, page6];

export async function importProjectsDataIntoDB(prismaClient: PrismaClient, seedMode = false): Promise<void> {
    const consoleLog = (...args: any[]): any => !seedMode && console.log(...args);

    for (let pageCounter = 0; pageCounter < pages.length; pageCounter++) {
        const page = pages[pageCounter];

        consoleLog(`Importing page ${pageCounter + 1} of ${pages.length}`);
        for (const project of page.projects) {
            // Rate limit the requests to the API
            await delay(100);
            try {
                //  Check if project already exists in DB
                const projectExists = await prismaClient.project.findFirst({
                    where: {
                        zooniverse_id: project.id,
                    },
                });

                if (projectExists) {
                    consoleLog(`Project "${project.display_name}" already exists in DB`);
                    continue;
                }

                await prismaClient.project.create({
                    data: {
                        display_name: project.display_name,
                        description: project.description,
                        avatar_src: project.avatar_src,
                        classifications_count: project.classifications_count,
                        completeness: project.completeness,
                        launch_approved: project.launch_approved,
                        links: JSON.stringify(project.links),
                        redirect: project.redirect,
                        slug: project.slug,
                        state: project.state,
                        updated_at: project.updated_at,
                        zooniverse_id: project.id,
                    },
                });

                consoleLog(`Imported project "${project.display_name}"`);
            } catch (error) {
                console.error(`Error importing project "${project.display_name}"`);
                console.error(error);
            }
        }

        consoleLog(`Finished importing page ${pageCounter + 1} of ${pages.length}`);
    }
}
