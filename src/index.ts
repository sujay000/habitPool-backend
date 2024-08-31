import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import cookieParser from 'cookie-parser'
import morgan from 'morgan'

import { FRONTEND_URL, PORT } from './config'
import authRouter from './auth'
import { authenticateToken } from './utilFunctions'
import taskRouter from './tasks'
import { getAirdrop } from './web3utils'

const app = express()
app.use(express.json())


app.use(morgan('tiny'))
app.use(cookieParser())

app.get('/test/:id', (req, res) => {
    const { id } = req.params
    return res.status(200).json({
        message: 'Hello World test ' + id,
    })
})


app.use(
    cors({
        credentials: true,
        origin: FRONTEND_URL,
    })
)

app.use('/auth', authRouter)
app.use('/tasks', authenticateToken, taskRouter);


app.get('/money', authenticateToken, async(req, res) => {
    //@ts-ignore
    const user = req.user
    const { valid, msg } = await getAirdrop(user.publicKey);
    
    return res.status(200).json({
        valid,
        msg
    })
})

app.listen(PORT, () => {
    console.log(`server is running on port ${PORT}`)
})

//refer for oauth2 : https://www.youtube.com/watch?v=ALYnRoeQoLs
