import axios from "axios"
import { env } from "../constant"
import logger from "../logger/index"




const apiKey = env.smsApiKey
const apiSecret = env.smsApiSecret



interface IBluckSend {
    phone: string,
    content: string
}

interface IBluckSendResult {
    phone: string,
    content: string,
    status: boolean,
    message: string

}


const send = async (phone: string, content: string) => {
    try {
        const response = await axios.post(`https://api.sms.com/sms/send?phone=${phone}&content=${content}`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            }
        })

        if (response.status === 200) {
            return true
        }
        return false

    } catch (error) {
        logger.info(error)
        return null
    }
}


const sendBluk = async (data: IBluckSend[]) => {

    const result: IBluckSendResult[] = []

    for (const d of data) {
        try {

            const sendOne = await send(d.phone, d.content)

            if (!sendOne) {
                result.push({
                    phone: d.phone,
                    content: d.content,
                    status: false,
                    message: "send sms once failed"
                })
            }
            result.push({
                phone: d.phone,
                content: d.content,
                status: true,
                message: "success"
            })
        }
        catch (error) {
            logger.info(error.message)
            result.push({
                phone: d.phone,
                content: d.content,
                status: false,
                message: error.message
            })
        }
    }

    return result

}

export const SMS = {
    send: send,
    sendBluk: sendBluk
}

