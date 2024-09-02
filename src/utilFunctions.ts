import { NextFunction, Request, Response } from "express";
import jwt from 'jsonwebtoken'
import { CRYPTO_KEY, EXTRA_SOL, JWT_SECRET, prisma, SOL_RENT } from "./config";
import { Task, TaskParticipant, TaskResult, TaskStatus, User } from "@prisma/client";
import { decryptMessageWithKey, getBalance, transferSol } from "./web3utils";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies.token;
    
    if (!token) return res.status(401).json({ 
        valid: false,
        msg: 'Access denied. No token provided.' 
    });

    // Verify the token
    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) return res.status(403).json({ message: 'Forbidden. Invalid token.' });

        // @ts-ignore
        req.user = user;

        // Proceed to the next middleware or route handler
        next();
    });
};

export async function completeTasks() {
    const tasks = await prisma.task.findMany({
        where: {
            status: TaskStatus.Pending,
            time: {
                lte: Math.floor(Date.now() / 1000)
            }
        },
        include: {
            creator: true,
            participants: true,
            results: true
        }
    })

    for (const task of tasks) {
        let arr = []
        arr.push(completeTask(task))

        if (arr.length === 25) {
            await Promise.all(arr)
            arr = []
        }
    }
}

async function completeTask(task: Task & { creator: User, participants: TaskParticipant[], results: TaskResult[] }) {
    console.log("task =================================================");
    console.log(task);
    console.log("task =================================================");
    
    const participants = task.participants
    const results = task.results

    let noConsensus = false
    if (participants.length !== results.length) {
        noConsensus = true
    }

    const allTrue = results.every(result => result.result)
    const allFalse = results.every(result => !result.result)

    if ((!allTrue && !allFalse) || noConsensus) {
        console.log("no consensus");
        
        await prisma.task.update({
            where: {
                taskId: task.taskId
            },
            data: {
                status: TaskStatus.NoConsensus
            }
        })

        return
    }
    
    if (allTrue) {
        console.log("all true");
        
        const balance = await getBalance(task.accountPublicKey)
        console.log("balance", balance);
        
        await transferSol(decryptMessageWithKey(task.accountPrivateKey!, CRYPTO_KEY), task.accountPublicKey, task.creator.publicKey, balance - EXTRA_SOL - SOL_RENT)
    }
    else if (allFalse) {
        console.log("all false");
        
        const friends = task.participants.filter(participant => participant.userId !== task.creatorId)
        const taskAmount = await getBalance(task.accountPublicKey) - (EXTRA_SOL * friends.length) - SOL_RENT
        const friendsAmount = friends.reduce((acc, friend) => acc + Number(friend.amount), 0)

        for (const friend of friends) {
            const friendUser = await prisma.user.findUnique({   
                where: {
                    userId: friend.userId
                }
            })
            if (!friendUser) {
                throw new Error("Friend user not found")
            }
            const amount = taskAmount * Number(friend.amount) / friendsAmount
            await transferSol(task.accountPrivateKey, task.accountPublicKey, friendUser.publicKey, amount )
        }
    }

    await prisma.task.update({
        where: {
            taskId: task.taskId
        },
        data: {
            status: TaskStatus.Done
        }
    })
}
