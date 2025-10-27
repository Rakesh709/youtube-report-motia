import { EventConfig } from 'motia';

//step2 :
//convert youtube handle/name to channel ID using youtube data api
export const config: EventConfig = {
    name: "SubmitChannel",
    type: "event",
    subscribes:["yt.submit"],
    emits: ['yt.channel.resolve','yt.channel.error']
}


export const handler = async  (eventData:any, {emit,logger,state} :any) => {

    let jobId : string | undefined
    let email: string | undefined

    try {

        const data = eventData || {}
        jobId= data.jobId;
        email= data.email;
        const channel = data.channel;

        logger.info("Resolving youtube channel",{jobId,channel})


        const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

        if(!YOUTUBE_API_KEY){
            throw new Error('Youtube apikey not configured')
        }

        const jobData =   await state.get(`job:${jobId}`)
        
        await state.set(`job:${jobId}`,{
            ...jobData,
            status:'resolving channel'
        })
        
        let channelId: string | null = null;
        let channelName :string = ""
        
        if(channel.startWith('@')){
            const handle = channel.substring(1)

            const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(
                handle
            )}&key=${YOUTUBE_API_KEY}`

            const searchResponse = await fetch(searchUrl)

            const searchData= await searchResponse.json();

            if(searchData.items && searchData.items.length > 0){
                channelId = searchData.items[0].snippet.channelId;
                channelName = searchData.items[0].snippet.title;
            }
        }else{
             const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(
                channel
            )}&key=${YOUTUBE_API_KEY}`

            const searchResponse = await fetch(searchUrl)

            const searchData= await searchResponse.json();

            if(searchData.items && searchData.items.length > 0){
                channelId = searchData.items[0].snippet.channelId;
                channelName = searchData.items[0].snippet.title;
            }
        }

        if(!channelId){
            logger.error("Error resolving channel",{channel});
            await state.set(`Job: ${jobId}`,{
            ...jobData,
            status:'failed',
            error:"Channel not found"
        })
        }

        
        await emit({
            topic: "yt.channel.resolve",
            data:{
                jobId,
                email,
            }
        })

        return;
        

    } catch (error: any) {
        logger.error('Error resolving channel',{error: error.message})

        if(!jobId || !email){
            logger.error("Cannot send error notification - missing jobid or email")
            return 
        }

        const jobData = await state.get(`job: ${jobId}`)

        await state.set(`job: ${jobId}`,{
            ...jobData,
            status:'failed',
            error:"error.message"
        })

        await emit({
            topic:"yt.channel.error",
            data:{
                jobId,
                email,
                error:'Failed to resolve channel. Please try agaian'
            }
        })
    }

}