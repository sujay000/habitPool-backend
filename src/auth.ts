import express from 'express'
import jwt, { decode, verify } from 'jsonwebtoken'
const authRouter = express.Router()

import { COOKIE_MAX_AGE_IN_STRING, CRYPTO_KEY, JWT_EXPIRE_TIME, JWT_SECRET, prisma } from './config'
import { Provider } from '@prisma/client'
import { decryptMessageWithKey, encryptMessageWithKey, getRandomPublicAndPrivateKey } from './web3utils'

async function handleGoogleCredential(access_token: string) {
    const url = 'https://www.googleapis.com/oauth2/v3/userinfo'

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${access_token}`,
            },
        })
        const data = await response.json()

        return {
            valid: data.email_verified,
            msg: data,
        }
    } catch (e) {
        console.log(e)

        return {
            valid: false,
            msg: e,
        }
    }
}

function handleGetJwtToken(email: string, username: string, publicKey: string, userId: number): string {
    if (!JWT_SECRET) {
        return 'jwt secret missing'
    }

    const jwtToken = jwt.sign({ email, username, publicKey, userId }, JWT_SECRET, { expiresIn: JWT_EXPIRE_TIME })

    return jwtToken
}


authRouter.post('/', async (req, res) => {
    const result = await handleGoogleCredential(req.body.access_token)

    if (!result.valid) {
        return res.status(400).json({
            valid: false,
            msg: 'There was an error while logging in ' + result.msg,
        })
    }

    const payload = result.msg
    const { email, name, given_name, family_name, picture } = payload

    let user = await prisma.user.findUnique({
        where: {
            email
        }
    })

    if (!user) {
        const {publicKey, privateKey} :{
            publicKey: string,
            privateKey: string
        } = getRandomPublicAndPrivateKey()

        const encryptedPrivateKey = encryptMessageWithKey(privateKey, CRYPTO_KEY)


        user = await prisma.user.create({
            data: {
                username: name,
                email,
                publicKey,
                picture,
                privateKey: encryptedPrivateKey,
                provider: Provider.Google,
            }
        })
    }

    const {privateKey, ...data} = user

    const jwtToken = handleGetJwtToken(email, name, data.publicKey, user.userId)

    res.cookie('token', jwtToken, {
        maxAge: Number(COOKIE_MAX_AGE_IN_STRING),
        httpOnly: true,
    })

    return res.status(200).json({
        valid: true,
        msg: data
    })
})

export default authRouter
