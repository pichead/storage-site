import Redis from "ioredis"
import { env } from "../constant"
import logger from "../logger/index"

const host = env.redis.host
const port = env.redis.port
const password = env.redis.password


const redis = new Redis({
    host,
    port: parseInt(port || '6379', 10),
    password: password || undefined
})


const set = async (key: string, value: any, ttlSeconds?: number) => {
    try {
        const stringValue = JSON.stringify(value);
        if (ttlSeconds) {
            const save = await redis.set(key, stringValue, 'EX', ttlSeconds);
            return save
        } else {
            const save = await redis.set(key, stringValue);
            return save
        }
    } catch (error) {
        logger.info(error.message)
        return null
    }
}

const get = async (key: string) => {
    try {
        const result = await redis.get(key);
        return result ? JSON.parse(result) : null
    } catch (error) {
        logger.info(error.message)
        return null
    }
}


const remove = async (key: string) => {
    try {
        const result = await redis.del(key);
        return result
    } catch (error) {
        logger.info(error.message)
        return null
    }
}

const isExist = async (key: string) => {
    try {
        const result = await redis.exists(key);
        return result
    } catch (error) {
        logger.info(error.message)
        return null
    }

}


export const REDIS = {
    set,
    get,
    remove,
    isExist
}