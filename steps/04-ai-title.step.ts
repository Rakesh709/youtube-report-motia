import { EventConfig } from 'motia';

//step4 :
//Uses open ai to generate improved title 
export const config = {
    name: "generateTitles",
    type: "event",
    subscribes: ["yt.videos.fetched"],
    emits: ['yt.titles.ready', 'yt.titles.error']
}

interface Video {
    videoId: string;
    title: string;
    url: string;
    publishedAt: string;
    thumbnail: string;
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

        const videoTitles = videos.map((v: Video, idx:number )=> `${idx+1}."${v.title}"`).join('\n')

        const prompt=``

        const response = await fetch('https://api.openai.com/v1/chat/completions',{
            method:'POST',
            headers:{
                'Content-Type':'application/json',

                'Authorization':`Bearer ${OPENAI_API_KEY}`
            },
            body:JSON.stringify({
                model:'gpt-4o-mini',
                messages:[
                    {role:'system',
                        content:"You are a youtube SEO and engagement expert who helps creators write better video titles"
                    },
                    {
                        role:'user',
                        content:prompt
                    }
                ],
                temperature:0.7,
                response_formate:{type:'json_object'}
            })
        })


        if(!response.ok){
            const errorData = await response.json()
            throw new Error(`OpenAI API error: ${errorData.error?.message} || "Unkown AI error`)
        }

        const aiResponse = await response.json()

        const aiContent = aiResponse.choices[0].message.content;

        const parsedResponse = JSON.parse(aiContent)

        const improvedTitles: ImprovedTitle[] = parsedResponse.map((title:any,idx:number)=> ({
            original: title.original,
            improved: title.improved,
            rational:title.rational,
            url:videos[idx].url
        }))

        logger.info("Titles generated successfully",{
            jobId,
            count:improvedTitles.length
        })

        await state.set(`job: ${jobId}`, {
            ...jobData,
            status: 'titles reddy',
            improvedTitles
        })

        await emit({
            topic: "yt.titles.ready",
            data: {
                jobId,
                channelName,
                improvedTitles,
                email,
            }
        })


        
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