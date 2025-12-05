import { SparkWallet } from '@buildonspark/spark-sdk';

const { bech32m } = require('bech32');

import serverConfig from './config-server';

let sparkWallet: SparkWallet;

export async function initializeSparkWallet() {
    try {
        console.log('Wallet initializing...');
        const { wallet, mnemonic } = await SparkWallet.initialize({
            mnemonicOrSeed: serverConfig.seed,
            options: {
                network: 'MAINNET',
            },
        });

        wallet.on('transfer:claimed', (transferId: string, updatedBalance: bigint) => {
            console.log(`Transfer ${transferId} claimed. New balance: ${Number(updatedBalance)}`);
        });

        sparkWallet = wallet;
        console.log('Wallet initialized successfully:', mnemonic?.split(' ')[0], mnemonic?.split(' ')[1], '...');
        return wallet;
    } catch (error) {
        console.error('Error initializing wallet:', error);
        throw error;
    }
}

export async function createInvoiceForSparkAddress(sparkAddress: string, amountSats: number, memo: string = 'Invoice'): Promise<string> {
    if (!sparkWallet) {
        throw new Error('Spark wallet not initialized');
    }

    const decoded = bech32m.decode(sparkAddress);

    let receiverIdentityPubkey = convert5BitArrayToHex(decoded.words);

    while (receiverIdentityPubkey.length > 66) {
        receiverIdentityPubkey = receiverIdentityPubkey.slice(1);
    }

    const invoice = await sparkWallet.createLightningInvoice({
        amountSats,
        memo,
        receiverIdentityPubkey,
    });

    console.log('Invoice for another user:', invoice);
    return invoice.invoice.encodedInvoice;
}

function convert5BitArrayToHex(words: number[]) {
    let bits = 0;
    let value = 0;
    const result = [];

    for (const word of words) {
        value = (value << 5) | word; // append 5 bits
        bits += 5;
        while (bits >= 8) {
            bits -= 8;
            result.push((value >> bits) & 0xff);
        }
    }

    // Convert byte array to hex string
    return result.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function getSparkWallet(): SparkWallet | undefined {
    return sparkWallet;
}
