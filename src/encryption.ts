import { scryptAsync } from '@noble/hashes/scrypt';
// @ts-ignore dont want to install @types/browserify-cipher as it has incorrect definition of the func we use
import * as aes from 'browserify-cipher';
import { hexToUint8Array, uint8ArrayToHex } from './uint8array-extras';

const createCipheriv = aes.createCipheriv;
const createDecipheriv = aes.createDecipheriv;

/**
 * Interface for Cryptographically Secure Pseudo-Random Number Generator
 */
export interface ICsprng {
    /**
     * Generates cryptographically secure random bytes
     * @param size Number of bytes to generate
     * @returns Promise that resolves to a Uint8Array containing the random bytes
     */
    randomBytes(size: number): Promise<Uint8Array>;
}

export interface IScryptConfig {
    N: number; // CPU/memory cost parameter
    r: number; // Block size parameter
    p: number; // Parallelization parameter
    dkLen: number; // Desired key length in bytes
}

export const scryptConfig: IScryptConfig = {
    N: 2 ** 10,
    r: 8,
    p: 1,
    dkLen: 32,
};

export const Csprng: ICsprng = {
    async randomBytes(size: number): Promise<Uint8Array> {
        const array = new Uint8Array(size);
        if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
            window.crypto.getRandomValues(array);
            return array;
        } else if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.getRandomValues) {
            globalThis.crypto.getRandomValues(array);
            return array;
        } else {
            throw new Error('No suitable crypto.getRandomValues implementation found');
        }
    },
};

/**
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
 */
export async function encrypt(scryptConfig: IScryptConfig, csprng: ICsprng, plaintext: string, password: string, saltValue: string): Promise<string> {
    const derivedKey = (await scryptAsync(normalizeString(password), saltValue, scryptConfig)) as Uint8Array;
    const initializationVector = await csprng.randomBytes(16);
    const encryptionCipher = createCipheriv('aes-256-gcm', derivedKey, initializationVector, { authTagLength: 16 });

    let ciphertextHex = encryptionCipher.update(plaintext, 'utf8', 'hex');
    ciphertextHex += encryptionCipher.final('hex');
    const authenticationTag = encryptionCipher.getAuthTag();

    // combine components into cryptogram string with format: <IV>:<Tag>:<Ciphertext>
    return [uint8ArrayToHex(initializationVector), authenticationTag.toString('hex'), ciphertextHex].join(':');
}

export async function decrypt(scryptConfig: IScryptConfig, encryptedData: string, password: string, saltValue: string): Promise<string> {
    // Parse cryptogram string in format <InitializationVector>:<AuthenticationTag>:<Ciphertext>
    const [initializationVectorHex, authenticationTagHex, ciphertextHex] = encryptedData.split(':');

    const derivedKey = (await scryptAsync(normalizeString(password), saltValue, scryptConfig)) as Uint8Array;

    const decryptionCipher = createDecipheriv('aes-256-gcm', derivedKey, hexToUint8Array(initializationVectorHex), { authTagLength: 16 });
    decryptionCipher.setAuthTag(hexToUint8Array(authenticationTagHex));
    let decryptedText = decryptionCipher.update(ciphertextHex, 'hex', 'utf8');
    decryptedText += decryptionCipher.final('utf8');

    return decryptedText;
}

/**
 * @see https://nodejs.org/api/crypto.html#using-strings-as-inputs-to-cryptographic-apis
 */
function normalizeString(input: string): string {
    return input.normalize('NFC');
}

/**
 * Hash a string using scrypt from noble
 * @param input - String to hash
 * @param salt - Salt value for hashing
 * @param config - Scrypt configuration parameters
 * @returns Hex string of hashed value
 */
export async function hashString(input: string, salt: string): Promise<string> {
    const normalized = normalizeString(input);
    const hashBytes = await scryptAsync(normalized, salt, {
        N: 2 ** 6,
        r: 8,
        p: 1,
        dkLen: 32,
    });
    return uint8ArrayToHex(hashBytes);
}
