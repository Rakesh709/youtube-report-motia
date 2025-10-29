import { EventConfig } from 'motia';

//step4 :
//Uses open ai to generate improved title 
export const config = {
    name: "generateTitles",
    type: "event",
    subscribes: ["yt.videos.fetched"],
    emits: ['yt.titles.ready', 'yt.titles.error']
}


interface ImprovedTitle {
    original: string;
    improved: string;
    rational: string;
    rationalurl: string;
    
}


export const handler = async (eventData: any, { emit, logger, state }: any) =>{

    let jobId: string | undefined
    let email: string | undefined

    try {

        const data = eventData || {}
        jobId = data.jobId;
        email = data.email;
        
        const channelName = data.channelName;
        const videos = data.videos;

        logger.info("Resolving youtube channel", { jobId, videosCount:videos.length })


        const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

        if (!OPENAI_API_KEY) {
            throw new Error('OPENAI apikey not configured')
        }

        const jobData = await state.get(`job:${jobId}`)


        await state.set(`job:${jobId}`, {
            ...jobData,
            status: 'generating titles'
        });

        


        
    } catch (error:any) {
        logger.error('Error generating titles', { error: error.message })

        if (!jobId || !email) {
            logger.error("Cannot send error notification - missing jobid or email")
            return
        }

        const jobData = await state.get(`job: ${jobId}`)

        await state.set(`job: ${jobId}`, {
            ...jobData,
            status: 'failed',
            error: error.message
        })

        await emit({
            topic: "yt.titles.error",
            data: {
                jobId,
                email,
                error: 'Failed to fetch improved titles for the videos. Please try agaian later'
            }
        })
    }

}