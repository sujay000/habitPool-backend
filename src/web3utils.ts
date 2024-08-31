import { Keypair, sendAndConfirmTransaction, SystemProgram, Transaction } from "@solana/web3.js";
import cryptoJS from "crypto-js";

import { clusterApiUrl, Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

export function getRandomPublicAndPrivateKey() {
	const keypair = Keypair.generate();
	const publicKey: string = keypair.publicKey.toBase58();
	const privateKey: string = keypair.secretKey.toString();
	return {
		publicKey,
		privateKey,
	};
}

export function encryptMessageWithKey(message: string, key: string): string {
	return cryptoJS.AES.encrypt(message, key).toString();
}

export function decryptMessageWithKey(
	encodedMessage: string,
	key: string,
): string {
	const bytes = cryptoJS.AES.decrypt(encodedMessage, key);
	return bytes.toString(cryptoJS.enc.Utf8);
}


export async function getAirdrop(publicKey: string) {
	console.log(publicKey);
	
	try {
		const signature = await connection.requestAirdrop(new PublicKey(publicKey), 1 * LAMPORTS_PER_SOL)
		const temp = await connection.confirmTransaction(signature);
		console.log(temp);
		return {
			valid: true,
			msg: signature
		}
	} catch (error) {
		console.error(error);
		return {
			valid: false,
			msg: `Failed to get airdrop ${error}`,
		}
	}
}

export async function getBalance(publicKey: string) {
    try {
        const balance = await connection.getBalance(new PublicKey(publicKey));
        return balance / LAMPORTS_PER_SOL;
    } catch (e) {
        console.log("There was an error while fetching the balance." + e);
    }
    return 0;
}

export async function transferSol(senderSecretKey: string, senderPublicKey: string, receiverPublicKey: string, amountSol: number) {
	const senderSecretKeyTransformed = transformPrivateKey(senderSecretKey);
	const senderKeypair = Keypair.fromSecretKey(Uint8Array.from(senderSecretKeyTransformed));
	console.log(senderSecretKey);
	console.log(senderSecretKeyTransformed);
	console.log(senderKeypair);
	
	const transaction = new Transaction().add(
		SystemProgram.transfer({
			fromPubkey: new PublicKey(senderPublicKey),
			toPubkey: new PublicKey(receiverPublicKey),
			lamports: amountSol * LAMPORTS_PER_SOL
		})
	);

	console.log("Here test sujsap==================");
	console.log(senderPublicKey);
	console.log(receiverPublicKey);
	console.log("Here test sujsap==================");

	try {
		const signature = await sendAndConfirmTransaction(connection, transaction, [senderKeypair]);
		console.log("Here sujsap==================");
		console.log(signature);
		console.log("Here sujsap==================");
		return signature
	} catch (error) {
		
		// @ts-ignore
		console.error(error.getLogs());
		throw new Error("There was an error while doing the transaction" + error);
	}
}

function transformPrivateKey(key: string) {
	const arr = key.split(',').map(x => Number(x))
	return arr
}