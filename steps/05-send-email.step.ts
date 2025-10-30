
import { EventConfig } from 'motia';
import { title } from 'process';

//step5 :
//sends formated email with improved titles to the user 
export const config = {
    name: "sendEmail",
    type: "event",
    subscribes: ["yt.videos.ready"],
    emits: ['yt.email.send',]
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


export const handler = async (eventData: any, { emit, logger, state }: any) => {
    let jobId: string | undefined
    let email: string | undefined

    try {
        const data = eventData || {};
        jobId = data.jobId;
        const email = data.email;
        const channelName = data.channelName;
        const imporovedTitles = data.improvedTitles


        logger.info("Sending email",{jobId,email,titleCount:imporovedTitles.length});

        const RESEND_API_KEY = process.env.OPENAI_API_KEY;
        const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL;

        if (!RESEND_API_KEY) {
            throw new Error('RESEND apikey not configured')
        }

        const jobData = await state.get(`job:${jobId}`)


        await state.set(`job:${jobId}`, {
            ...jobData,
            status: 'SENDING EMAIL'
        });


        const emailText = generateEmailText(channelName,imporovedTitles)

        const response = await fetch('https://api.resend.com/emails',{
            method:"POST",
            headers:{
                'Content-Type':'application/json',

                'Authorization':`Bearer ${RESEND_API_KEY}`
            },
            body: JSON.stringify({
                from: RESEND_FROM_EMAIL,
                to: [email],
                subject:`New Titles for ${channelName}`,
                text:emailText
            })
        })

        if(!response.ok){
            const errorData = await response.json()
            throw new Error(`Resend API error: ${errorData.error?.message} || "Unkown email error`)
        }

        const emailResult = await response.json()

        logger.info("Email send successfully",{jobId,emailId:emailResult.id});

        await state.set(`job: ${jobId}`, {
            ...jobData,
            status: 'Completed',
            emailId: emailResult.id,
            completedAt :new Date().toISOString()
        });

        await emit({
            topic: "yt.email.send",
            data: {
                jobId,
                email,
                emailId: emailResult.id,
                
            },
        })






    } catch (error:any) {
        logger.error('Error sending email', { error: error.message })

        if (!jobId ) {
            logger.error("Cannot send email - missing jobid")
            return
        }

        const jobData = await state.get(`job: ${jobId}`)

        await state.set(`job: ${jobId}`, {
            ...jobData,
            status: 'failed',
            error: error.message
        })

        
    }



}



function generateEmailText( 
    channelName: string,
    title: ImprovedTitle[]) : any {

}