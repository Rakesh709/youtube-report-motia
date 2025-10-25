import { ApiRouteConfig } from 'motia';

//step1 :
//Accept channel name and email to start the work flow
export const config: ApiRouteConfig = {
    name: "SubmitChannel",
    type: "api",
    path: "/submit",
    method: "POST",
    emits: ['yt.submit']
}


interface SubmitRequest {
    channel: string;
    email: string;
}


export const handler = async (req: any, { emit, logger, state }: any) => {
    try {

        logger.info('Recived submition request', { body: req.body })

        const { channel, email } = req.body as SubmitRequest;

        if (!channel || !email) {
            return {
                status: 400,
                body: {
                    error: "Missing required fields:channel and email"
                },
            };
        }

        //validate email
        const emailRegix = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

        if (!emailRegix.test(email)) {
            return {
                status: 400,
                body: {
                    error: "Invalid email formate"
                },
            }
        }

        const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2.9)}`;

        await state.set(`job: ${jobId}`, {
            jobId,
            channel,
            email,
            status: "queued",
            createdAt: new Date().toISOString()

        })

        logger.info('Job created', { jobId, channel, email })

        await emit({
            topic: "yt.submit",
            date: {
                jobId,
                channel,
                email,
            }
        })


        return {
            status: 202,
            body:{
                success: true,
                jobId,
                message: "Your request has been queued. you will get an email soon with improved suggestion for youtube videos."
            }
        }



    } catch (error: any) {
        logger.error('Error in submission handler', { error: error.message })
        return {
            status: 500,
            body: {
                error: "Internal server error"
            },
        };
    }
}