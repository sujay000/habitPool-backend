import express from 'express'
import { CRYPTO_KEY, prisma } from './config'
import { decryptMessageWithKey, encryptMessageWithKey, getBalance, getRandomPublicAndPrivateKey, transferSol } from './web3utils'
import { empty } from '@prisma/client/runtime/library'
import e from 'express'
const taskRouter = express.Router()


taskRouter.get("/", async (req, res) => {
    //@ts-ignore    
    const user = req.user
    const { username, email, publicKey, userId } = user

    try {
        const tasks = await prisma.task.findMany({
            where: {
                creatorId: user.userId
            },
            include: {
                participants: {
                    include: {
                        user: true, // Include user details for each participant
                    },
                },
                results: {
                    include: {
                        user: true, // Include user details for each result
                    },
                }
            },
        })

        const filteredTasks = tasks.map((task) => {
            const participants = task.participants
            const filteredParticipants = participants.map((participant) => {
                return {
                    publicKey: participant.user.publicKey,
                    email: participant.user.email,
                    amount: participant.amount
                }
            })

            const results = task.results
            const filteredResults = results.map((result) => {
                return {
                    publicKey: result.user.publicKey,
                    email: result.user.email,
                    result: result.result
                }
            })
            
            return {
                taskId: task.taskId,
                name: task.name,
                description: task.description,
                time: task.time,
                creatorPublicKey: publicKey,
                creatorEmail: email,
                participants: filteredParticipants,
                results: filteredResults
            }
        })

        return res.status(200).json({
            valid: true,
            msg: filteredTasks,
            extra: tasks
        })

    } catch (error) {
        console.log(`there was error while fetching tasks ${error}`);
        return res.status(500).json({
            valid: false,
            msg: "Internal server error"
        })
    }
})

taskRouter.post('/create', async (req, res) => {
    //@ts-ignore    
    const user = req.user
    const { username, email, publicKey } = user

    let { name, description, amount, time } = req.body

    amount = parseFloat(amount)
    time = Number(time)

    try {
        const balance = await getBalance(publicKey)
        if (balance < amount) {
            return res.status(400).json({
                valid: false,
                msg: "insufficient balance, please add money to your wallet"
            })
        }
        
        const user = await prisma.user.findUnique({
            where: {
                email,
                publicKey
            }
        })

        if (!user) {
            return res.status(400).json({
                valid: false,
                msg: "user not found"
            })
        }

        const { publicKey: accountPublicKey, privateKey: accountPrivateKey }: {
            publicKey: string,
            privateKey: string
        } = getRandomPublicAndPrivateKey()
        const encryptedPrivateKey = encryptMessageWithKey(accountPrivateKey, CRYPTO_KEY)

        const transactionSignature = await transferSol(decryptMessageWithKey(user.privateKey!, CRYPTO_KEY), user.publicKey, accountPublicKey, amount)
        
        const task = await prisma.task.create({
            data: {
                name,
                description,
                creatorId: user.userId,
                time,
                accountPublicKey,
                accountPrivateKey: encryptedPrivateKey,
                status: "Pending",
            }
        })

        const taskParticipant = await prisma.taskParticipant.create({
            data: {
                userId: user.userId,
                taskId: task.taskId,
                amount: parseFloat(amount),
            }
        })

    } catch (error) {
        console.log(`there was error while creating task ${error}`);
        return res.status(500).json({
            valid: false,
            msg: `Internal server error ${error}`
        })
    }

    return res.status(200).json({
        valid: true,
        msg: "task created successfully"
    })
})


taskRouter.post('/add-participant', async (req, res) => {
    //@ts-ignore    
    // const user = req.user  
    // const {username, email, publicKey } = user

    const { email: participantEmail, taskId} = req.body


    try {
        const user = await prisma.user.findUnique({
            where: {
                email: participantEmail
            }
        })
        if (!user) {
            return res.status(400).json({
                valid: false,
                msg: `user with email ${participantEmail} not found, please ask your friend to register first on the site`
            })
        }
        const isParticipantAlreadyAdded = await prisma.taskParticipant.findFirst({
            where: {
                taskId: taskId,
                userId: user.userId
            }
        })

        if(isParticipantAlreadyAdded) {
            return res.status(400).json({
                valid: true,
                msg: "participant already added"
            })
        }
        
        const taskParticipant = await prisma.taskParticipant.create({
            data: {
                userId: user.userId,
                taskId: taskId,
                amount: 0.0,
            }
        })

    } catch (error) {
        console.log(`there was error while adding friend ${error}`);
        return res.status(500).json({
            valid: false,
            msg: "Internal server error"
        })
    }

    return res.status(200).json({
        valid: true,
        msg: "friend added successfully"
    })
})


taskRouter.post('/add-amount', async (req, res) => {
    // @ts-ignore    
    const user = req.user  
    const {username, email, publicKey } = user

    let { taskId, amount} = req.body
    taskId = parseInt(taskId)
    amount = parseFloat(amount)
    amount = Number(amount)
    
    try {
        const task = await prisma.task.findUnique({
            where: {
                taskId
            }
        })

        if (!task) {
            return res.status(400).json({
                valid: false,
                msg: "task not found"
            })
        }

        const user = await prisma.user.findUnique({
            where: {
                email,
                publicKey
            }
        })

        if (!user) {
            return res.status(400).json({
                valid: false,
                msg: "user not found"
            })
        }

        const updatedTaskParticipant = await prisma.taskParticipant.upsert({
            where: {
                taskId_userId: {
                    taskId: task.taskId,
                    userId: user.userId
                }
            },
            update: {
                amount: {
                    increment: parseFloat(amount)
                }
            },
            create: {
                taskId: task.taskId,
                userId: user.userId,
                amount: parseFloat(amount)
            }
        });
    } catch (error) {
        console.log(`there was error while adding amount ${error}`);
        return res.status(500).json({
            valid: false,
            msg: "Internal server error"
        })
    }


    return res.status(200).json({
        valid: true,
        msg: "amount added successfully"
    })
})


taskRouter.post('/done', async (req, res) => {
    //@ts-ignore    
    const user = req.user  
    const {username, email, publicKey } = user

    let { taskId} = req.body
    taskId = parseInt(taskId)
    
    try {
        const task = await prisma.task.findUnique({
            where: {
                taskId
            }
        })

        if (!task) {
            return res.status(400).json({
                valid: false,
                msg: "task not found"
            })
        }

        const taskResult = await prisma.taskResult.findFirst({
            where: {
                taskId: task.taskId,
                userId: user.userId
            }
        })

        if(taskResult) {
            return res.status(400).json({
                valid: false,
                msg: "task already done"
            })
        }

        await prisma.taskResult.create({
            data: {
                taskId: task.taskId,
                userId: user.userId,
                result: true
            }
        })


    } catch (error) {
        console.log(`there was error while creating task ${error}`);
        return res.status(500).json({
            valid: false,
            msg: "Internal server error"
        })
    }


    return res.status(200).json({
        valid: true,
        msg: "task marked as done successfully"
    })
})

export default taskRouter