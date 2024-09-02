const PORT = process.env.PORT || 8080
const JWT_SECRET = process.env.JWT_SECRET!
const CLIENT_ID = process.env.CLIENT_ID!
const JWT_EXPIRE_TIME = process.env.JWT_EXPIRE_TIME!
const COOKIE_MAX_AGE_IN_STRING = process.env.COOKIE_MAX_AGE_IN_STRING!
const FRONTEND_URL = process.env.FRONTEND_URL!

import { PrismaClient } from "@prisma/client"
import { LAMPORTS_PER_SOL } from "@solana/web3.js"
const prisma = new PrismaClient();

const CRYPTO_KEY = process.env.CRYPTO_KEY!
const CUSTOM_ENV = process.env.CUSTOM_ENV!
const EXTRA_SOL = 6000/LAMPORTS_PER_SOL
const SOL_RENT = 2900000/LAMPORTS_PER_SOL

export { 
    JWT_SECRET, 
    CLIENT_ID, 
    JWT_EXPIRE_TIME, 
    COOKIE_MAX_AGE_IN_STRING, 
    FRONTEND_URL, 
    PORT, 
    prisma, 
    CRYPTO_KEY,
    CUSTOM_ENV,
    EXTRA_SOL,
    SOL_RENT
}
