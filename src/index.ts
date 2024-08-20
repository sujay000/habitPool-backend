import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import cookieParser from 'cookie-parser'
import morgan from 'morgan'

import { CLIENT_ID, COOKIE_MAX_AGE_IN_STRING, FRONTEND_URL, JWT_EXPIRE_TIME, JWT_SECRET } from './config'
import authRouter from './auth'

const app = express()
app.use(express.json())

const PORT = 3000

app.use(morgan('tiny'))
app.use(cookieParser())
app.use(
    cors({
        credentials: true,
        origin: FRONTEND_URL,
    })
)

app.use('/auth', authRouter)

app.listen(PORT, () => {
    console.log(`server is running on port ${PORT}`)
})

//refer for oauth2 : https://www.youtube.com/watch?v=ALYnRoeQoLs
