import { Csprng, decrypt, encrypt, scryptConfig } from './encryption';

// Constants for localStorage keys
const MNEMONIC_STORAGE_KEY = 'encrypted_mnemonic';
const DEVICE_SALT_KEY = 'device_salt';

/**
 * Storage wrapper class for handling encrypted mnemonic storage
 */
export class SecureStorage {
    /**
     * Generate or retrieve a device-specific salt
     * @returns Promise that resolves to a unique salt for this device/browser
     */
    private static async getDeviceSalt(): Promise<string> {
        // Check if we already have a device salt stored
        let deviceSalt = localStorage.getItem(DEVICE_SALT_KEY);

        if (!deviceSalt) {
            const randomBytes = await Csprng.randomBytes(32);
            const randomHex = Array.from(randomBytes)
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');

            // Combine fingerprint with random data
            deviceSalt = `sparkhub-salt-${randomHex}`;

            // Store the generated salt for future use
            localStorage.setItem(DEVICE_SALT_KEY, deviceSalt);
        }

        return deviceSalt;
    }
    /**
     * Save and encrypt a mnemonic to localStorage
     * @param mnemonic - The mnemonic phrase to encrypt and store
     * @param password - The password to use for encryption
     * @returns Promise that resolves when the mnemonic is successfully stored
     */
    static async saveMnemonic(mnemonic: string, password: string): Promise<void> {
        try {
            const deviceSalt = await SecureStorage.getDeviceSalt();
            const encryptedMnemonic = await encrypt(scryptConfig, Csprng, mnemonic, password, deviceSalt);

            localStorage.setItem(MNEMONIC_STORAGE_KEY, encryptedMnemonic);
        } catch (error) {
            throw new Error(`Failed to save mnemonic: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Check if an encrypted mnemonic exists in localStorage
     * @returns boolean indicating whether an encrypted mnemonic is stored
     */
    static hasMnemonic(): boolean {
        const storedData = localStorage.getItem(MNEMONIC_STORAGE_KEY);
        return storedData !== null && storedData.length > 0;
    }

    /**
     * Retrieve and decrypt a mnemonic from localStorage
     * @param password - The password to use for decryption
     * @returns Promise that resolves to the decrypted mnemonic string
     * @throws Error if decryption fails or no mnemonic is stored
     */
    static async getMnemonic(password: string): Promise<string> {
        const encryptedMnemonic = localStorage.getItem(MNEMONIC_STORAGE_KEY);

        if (!encryptedMnemonic) {
            throw new Error('No encrypted mnemonic found in storage');
        }

        try {
            const deviceSalt = await SecureStorage.getDeviceSalt();
            const decryptedMnemonic = await decrypt(scryptConfig, encryptedMnemonic, password, deviceSalt);

            return decryptedMnemonic;
        } catch (error) {
            throw new Error(`Failed to decrypt mnemonic: ${error instanceof Error ? error.message : 'Invalid password or corrupted data'}`);
        }
    }

    /**
     * Remove the encrypted mnemonic from localStorage
     * @param clearDeviceSalt - Optional flag to also clear the device salt (default: false)
     * @returns boolean indicating whether the mnemonic was successfully removed
     */
    static removeMnemonic(clearDeviceSalt: boolean = false): boolean {
        try {
            localStorage.removeItem(MNEMONIC_STORAGE_KEY);
            if (clearDeviceSalt) {
                localStorage.removeItem(DEVICE_SALT_KEY);
            }
            return true;
        } catch (_) {
            return false;
        }
    }

    /**
     * Reset the device salt (generates a new one on next use)
     * This will make any existing encrypted data unrecoverable
     * @returns boolean indicating whether the salt was successfully cleared
     */
    static resetDeviceSalt(): boolean {
        try {
            localStorage.removeItem(DEVICE_SALT_KEY);
            return true;
        } catch (_) {
            return false;
        }
    }
}
