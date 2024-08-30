import { NextFunction, Request, Response } from "express";
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from "./config";

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