import { EventConfig } from 'motia';
import { title } from 'process';

//step5 :
//sends formated email with improved titles to the user 
export const config = {
    name: "sendEmail",
    type: "event",
    subscribes: ["yt.cannel.error","yt.videos.error","yt,titles.error"],
    emits: ['yt.error.notification',]
}






export const handler = async (eventData: any, { emit, logger, state }: any) => {

        const data = eventData || {};
        const jobId = data.jobId;
        const email = data.email;
        const error = data.error;


        logger.info("Handling error notification",{jobId,email});

}