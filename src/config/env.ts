import dotenv from "dotenv";

dotenv.config();

export const PORT = process.env.PORT
export const MAIL_USER = process.env.MAIL_USER
export const MAIL_PASS = process.env.MAIL_PASS
export const JWT_SECRET = process.env.JWT_SECRET
export const JWT_SECRET_RESET = process.env.JWT_SECRET_RESET
export const JWT_SECRET_VERIFY = process.env.JWT_SECRET_VERIFY
export const XENDIT_SECRET_KEY = process.env.XENDIT_SECRET_KEY
export const BASE_URL_FE = process.env.BASE_URL_FE
export const REDIS_HOST = process.env.REDIS_HOST
export const REDIS_PORT = process.env.REDIS_PORT
