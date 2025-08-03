import { SparkWallet } from '@buildonspark/spark-sdk';
import { treaty } from '@elysiajs/eden';
import { useContext, useEffect, useState } from 'preact/hooks';
import { route } from 'preact-router';
import { config } from '../../config';
import type { App } from '../../index';
import { PasswordContext } from '../../password-context';
import { SecureStorage } from '../../storage';
import { SendModal } from './SendModal';

interface PasswordDialogProps {
    onSuccess: (wallet: SparkWallet) => void;
    onCancel: () => void;
    onError: (error: string) => void;
    error: string;
}

function PasswordDialog({ onSuccess, onCancel, onError, error }: PasswordDialogProps) {
    const { setPassword: setPasswordInContext } = useContext(PasswordContext);
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        if (!password.trim()) return;

        setIsLoading(true);
        try {
            const mnemonic = await SecureStorage.getMnemonic(password);

            // Initialize SparkWallet with the recovered mnemonic
            const { wallet } = await SparkWallet.initialize({
                mnemonicOrSeed: mnemonic,
                options: {
                    network: 'MAINNET',
                },
            });

            onSuccess(wallet);
            setPasswordInContext(password);
        } catch (err) {
            console.error('Failed to unlock wallet:', err);
            onError('Invalid password or corrupted data. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const styles = {
        overlay: {
            position: 'fixed' as const,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(5px)',
        },
        dialog: {
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '40px',
            borderRadius: '20px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            maxWidth: '400px',
            width: '90%',
            textAlign: 'center' as const,
            border: '1px solid rgba(255, 255, 255, 0.2)',
        },
        title: {
            fontSize: '24px',
            fontWeight: '700',
            color: 'white',
            marginBottom: '8px',
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        },
        subtitle: {
            fontSize: '16px',
            color: 'rgba(255, 255, 255, 0.9)',
            marginBottom: '24px',
            lineHeight: '1.5',
        },
        input: {
            width: '100%',
            padding: '16px',
            fontSize: '16px',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '12px',
            outline: 'none',
            transition: 'all 0.3s ease',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            color: '#2d3748',
            marginBottom: '20px',
            backdropFilter: 'blur(10px)',
        },
        buttonPrimary: {
            width: '100%',
            padding: '16px 24px',
            fontSize: '16px',
            fontWeight: '600',
            background: 'rgba(255, 255, 255, 0.9)',
            color: '#667eea',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            marginBottom: '12px',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
        },
        buttonSecondary: {
            width: '100%',
            padding: '16px 24px',
            fontSize: '16px',
            fontWeight: '600',
            background: 'rgba(255, 255, 255, 0.15)',
            color: 'white',
            border: '2px solid rgba(255, 255, 255, 0.4)',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            backdropFilter: 'blur(10px)',
        },
        error: {
            color: '#ff6b6b',
            fontSize: '14px',
            marginBottom: '16px',
            padding: '12px',
            backgroundColor: 'rgba(255, 107, 107, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 107, 107, 0.3)',
        },
    };

    return (
        <div style={styles.overlay}>
            <div style={styles.dialog}>
                <div style={styles.title}>🔐 Unlock Wallet</div>
                <div style={styles.subtitle}>Enter your password to access your dashboard</div>

                {error && <div style={styles.error}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <input type="password" value={password} onInput={e => setPassword((e.target as HTMLInputElement).value)} placeholder="Enter your password" style={styles.input} autoFocus />

                    <button
                        type="submit"
                        disabled={!password.trim() || isLoading}
                        style={{
                            ...styles.buttonPrimary,
                            opacity: !password.trim() || isLoading ? 0.6 : 1,
                            cursor: !password.trim() || isLoading ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {isLoading ? '🔄 Unlocking...' : '✨ Unlock Dashboard'}
                    </button>

                    <button type="button" onClick={onCancel} style={styles.buttonSecondary}>
                        Cancel
                    </button>
                </form>
            </div>
        </div>
    );
}

interface ClaimUsernameModalProps {
    onSuccess: (username: string) => void;
    onCancel: () => void;
    onError: (error: string) => void;
    error: string;
    isLoading: boolean;
    value: string;
    onValueChange: (value: string) => void;
    wallet: SparkWallet;
}

function ClaimUsernameModal({ onSuccess, onCancel, onError, error, isLoading, value, onValueChange, wallet }: ClaimUsernameModalProps) {
    const [localLoading, setLocalLoading] = useState(false);

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        if (!value.trim() || localLoading) return;

        setLocalLoading(true);
        try {
            const sparkAddress = await wallet.getSparkAddress();
            const app = treaty<App>(`${config.domain}`);

            const response = await app.api.users.post({
                username: value.trim(),
                sparkAddress: sparkAddress,
            });

            if (response.data?.status === 'ok') {
                onSuccess(value.trim());
            } else {
                onError(response.data?.message || 'Failed to claim username');
            }
        } catch (err) {
            console.error('Failed to claim username:', err);
            onError('Network error. Please try again.');
        } finally {
            setLocalLoading(false);
        }
    };

    const currentLoading = isLoading || localLoading;

    const styles = {
        overlay: {
            position: 'fixed' as const,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(5px)',
        },
        dialog: {
            background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
            padding: '40px',
            borderRadius: '20px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            maxWidth: '400px',
            width: '90%',
            textAlign: 'center' as const,
            border: '1px solid rgba(255, 255, 255, 0.2)',
        },
        title: {
            fontSize: '24px',
            fontWeight: '700',
            color: 'white',
            marginBottom: '8px',
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        },
        subtitle: {
            fontSize: '16px',
            color: 'rgba(255, 255, 255, 0.9)',
            marginBottom: '24px',
            lineHeight: '1.5',
        },
        input: {
            width: '100%',
            padding: '16px',
            fontSize: '16px',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '12px',
            outline: 'none',
            transition: 'all 0.3s ease',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            color: '#2d3748',
            marginBottom: '20px',
            backdropFilter: 'blur(10px)',
        },
        buttonPrimary: {
            width: '100%',
            padding: '16px 24px',
            fontSize: '16px',
            fontWeight: '600',
            background: 'rgba(255, 255, 255, 0.9)',
            color: '#48bb78',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            marginBottom: '12px',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
        },
        buttonSecondary: {
            width: '100%',
            padding: '16px 24px',
            fontSize: '16px',
            fontWeight: '600',
            background: 'rgba(255, 255, 255, 0.15)',
            color: 'white',
            border: '2px solid rgba(255, 255, 255, 0.4)',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            backdropFilter: 'blur(10px)',
        },
        error: {
            color: '#ff6b6b',
            fontSize: '14px',
            marginBottom: '16px',
            padding: '12px',
            backgroundColor: 'rgba(255, 107, 107, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 107, 107, 0.3)',
        },
    };

    return (
        <div style={styles.overlay}>
            <div style={styles.dialog}>
                <div style={styles.title}>🌟 Claim Your Username</div>
                <div style={styles.subtitle}>Choose a unique username for your Lightning Address</div>

                {error && <div style={styles.error}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        value={value}
                        onInput={e => onValueChange((e.target as HTMLInputElement).value)}
                        placeholder="Enter your username"
                        style={styles.input}
                        autoFocus
                        disabled={currentLoading}
                    />

                    <button
                        type="submit"
                        disabled={!value.trim() || currentLoading}
                        style={{
                            ...styles.buttonPrimary,
                            opacity: !value.trim() || currentLoading ? 0.6 : 1,
                            cursor: !value.trim() || currentLoading ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {currentLoading ? '🔄 Claiming...' : '✨ Claim Username'}
                    </button>

                    <button type="button" onClick={onCancel} style={styles.buttonSecondary} disabled={currentLoading}>
                        Cancel
                    </button>
                </form>
            </div>
        </div>
    );
}

export function DashboardPage({ path: _path }: { path?: string }) {
    const { password: passwordFromContext } = useContext(PasswordContext);
    const [wallet, setWallet] = useState<SparkWallet | null>(null);
    const [balance, setBalance] = useState<number | null>(null);
    const [showPasswordDialog, setShowPasswordDialog] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [username, setUsername] = useState<string>('');
    const [showClaimUsernameModal, setShowClaimUsernameModal] = useState(false);
    const [claimUsernameInput, setClaimUsernameInput] = useState('');
    const [claimUsernameError, setClaimUsernameError] = useState('');
    const [isClaimingUsername, setIsClaimingUsername] = useState(false);
    const [showSendModal, setShowSendModal] = useState(false);

    // Check if mnemonic exists on component mount
    useEffect(() => {
        const checkMnemonic = async () => {
            try {
                if (!SecureStorage.hasMnemonic()) {
                    // Redirect to login if no mnemonic
                    route('/login');
                    return;
                }

                if (passwordFromContext) {
                    // password is set, lets initialize the wallet
                    const mnemonicOrSeed = await SecureStorage.getMnemonic(passwordFromContext);
                    const { wallet } = await SparkWallet.initialize({
                        mnemonicOrSeed,
                        options: {
                            network: 'MAINNET',
                        },
                    });
                    setWallet(wallet);
                    setIsLoading(false);
                    return;
                }

                // Mnemonic exists, but no passsword, lets show password dialog
                setShowPasswordDialog(true);
                setIsLoading(false);
            } catch (err) {
                console.error('Error checking mnemonic:', err);
                route('/login');
            }
        };

        checkMnemonic();
    }, []);

    // Set up balance polling when wallet is initialized
    useEffect(() => {
        if (!wallet) return;

        const checkBalance = async () => {
            try {
                const currentBalance = await wallet.getBalance();
                setBalance(Number(currentBalance.balance));
            } catch (err) {
                console.error('Error fetching balance:', err);
            }
        };

        // Initial balance check
        checkBalance();

        // Set up interval to check balance every 3 sec
        const balanceInterval = setInterval(checkBalance, 3_000);

        // Cleanup interval on unmount or wallet change
        return () => clearInterval(balanceInterval);
    }, [wallet]);

    // Load username by spark address when wallet is initialized
    useEffect(() => {
        if (!wallet) return;

        const loadUsername = async () => {
            try {
                const sparkAddress = await wallet.getSparkAddress();
                const app = treaty<App>(`${config.domain}`);

                const response = await app.api.users['by-spark-address']({ sparkAddress }).get();

                if (response.data?.status === 'ok' && response.data?.username) {
                    setUsername(response.data.username);
                } else {
                    // No username set in database, set to empty string
                    setUsername('');
                }
            } catch (err) {
                console.error('Error fetching username:', err);
                // On error, set username to empty string
                setUsername('');
            }
        };

        loadUsername();
    }, [wallet]);

    const handlePasswordSuccess = (walletInstance: SparkWallet) => {
        setWallet(walletInstance);
        setShowPasswordDialog(false);
        setError('');
    };

    const handlePasswordCancel = () => {
        route('/login');
    };

    const handleClaimUsernameSuccess = (newUsername: string) => {
        setUsername(newUsername);
        setShowClaimUsernameModal(false);
        setClaimUsernameInput('');
        setClaimUsernameError('');
    };

    const handleClaimUsernameCancel = () => {
        setShowClaimUsernameModal(false);
        setClaimUsernameInput('');
        setClaimUsernameError('');
        setIsClaimingUsername(false);
    };

    const handleClaimUsernameError = (error: string) => {
        setClaimUsernameError(error);
        setIsClaimingUsername(false);
    };

    const startClaimingUsername = () => {
        setShowClaimUsernameModal(true);
        setClaimUsernameError('');
    };

    const formatBalance = (sats: number): string => {
        return sats.toLocaleString();
    };

    const styles = {
        container: {
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            flexDirection: 'column' as const,
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        },
        content: {
            maxWidth: '800px',
            width: '100%',
            textAlign: 'center' as const,
        },
        header: {
            marginBottom: '40px',
        },
        title: {
            fontSize: '48px',
            fontWeight: '700',
            color: 'white',
            textAlign: 'center' as const,
            marginBottom: '16px',
            textShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
            background: 'linear-gradient(45deg, #fff, #f0f8ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
        },
        subtitle: {
            fontSize: '20px',
            color: 'rgba(255, 255, 255, 0.9)',
            textAlign: 'center' as const,
            marginBottom: '8px',
            lineHeight: '1.5',
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
        },
        balanceCard: {
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '24px',
            padding: '60px 40px',
            marginBottom: '32px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(20px)',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        },
        balanceLabel: {
            fontSize: '18px',
            color: '#667eea',
            fontWeight: '600',
            marginBottom: '16px',
            textTransform: 'uppercase' as const,
            letterSpacing: '1px',
        },
        balanceAmount: {
            fontSize: '72px',
            fontWeight: '800',
            color: '#2d3748',
            marginBottom: '8px',
            lineHeight: '1.1',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
        },
        balanceUnit: {
            fontSize: '24px',
            color: '#718096',
            fontWeight: '500',
            textTransform: 'uppercase' as const,
            letterSpacing: '2px',
        },
        statsGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
            marginTop: '32px',
        },
        statCard: {
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            transition: 'transform 0.3s ease',
        },
        statLabel: {
            fontSize: '14px',
            color: 'rgba(255, 255, 255, 0.8)',
            marginBottom: '8px',
            fontWeight: '500',
            textTransform: 'uppercase' as const,
            letterSpacing: '1px',
        },
        statValue: {
            fontSize: '20px',
            color: 'white',
            fontWeight: '700',
        },
        loadingSpinner: {
            fontSize: '48px',
            animation: 'spin 2s linear infinite',
        },
        buttonContainer: {
            display: 'flex',
            gap: '16px',
            marginTop: '32px',
            justifyContent: 'center',
            flexWrap: 'wrap' as const,
        },
        actionButton: {
            flex: '1',
            minWidth: '140px',
            maxWidth: '200px',
            padding: '16px 24px',
            fontSize: '16px',
            fontWeight: '700',
            border: 'none',
            borderRadius: '16px',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative' as const,
            overflow: 'hidden',
            textTransform: 'uppercase' as const,
            letterSpacing: '1px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
        },
        receiveButton: {
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #ffffff 100%), linear-gradient(45deg, transparent 30%, rgba(255, 215, 0, 0.1) 50%, transparent 70%)',
            backgroundSize: '100% 100%, 200% 200%',
            color: '#2d3748',
            boxShadow: '0 6px 25px rgba(255, 255, 255, 0.8), 0 0 20px rgba(255, 215, 0, 0.3), inset 0 1px 3px rgba(255, 255, 255, 0.5)',
            border: '2px solid rgba(255, 215, 0, 0.3)',
            animation: 'shimmer 3s ease-in-out infinite',
        },
        sendButton: {
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #ffffff 100%), linear-gradient(45deg, transparent 30%, rgba(138, 43, 226, 0.1) 50%, transparent 70%)',
            backgroundSize: '100% 100%, 200% 200%',
            color: '#2d3748',
            boxShadow: '0 6px 25px rgba(255, 255, 255, 0.8), 0 0 20px rgba(138, 43, 226, 0.3), inset 0 1px 3px rgba(255, 255, 255, 0.5)',
            border: '2px solid rgba(138, 43, 226, 0.3)',
            animation: 'shimmer 3s ease-in-out infinite 1.5s',
        },
        refreshButton: {
            background: 'rgba(255, 255, 255, 0.1)',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            color: 'white',
            fontSize: '14px',
            fontWeight: '600',
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            backdropFilter: 'blur(10px)',
            marginTop: '16px',
            alignSelf: 'center',
        },
    };

    if (isLoading) {
        return (
            <div style={styles.container}>
                <div style={styles.loadingSpinner}>⚡</div>
                <div style={{ color: 'white', marginTop: '20px', fontSize: '18px' }}>Loading Dashboard...</div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {showPasswordDialog && <PasswordDialog onSuccess={handlePasswordSuccess} onCancel={handlePasswordCancel} onError={setError} error={error} />}
            {showClaimUsernameModal && wallet && (
                <ClaimUsernameModal
                    onSuccess={handleClaimUsernameSuccess}
                    onCancel={handleClaimUsernameCancel}
                    onError={handleClaimUsernameError}
                    error={claimUsernameError}
                    isLoading={isClaimingUsername}
                    value={claimUsernameInput}
                    onValueChange={setClaimUsernameInput}
                    wallet={wallet}
                />
            )}
            {showSendModal && wallet && <SendModal wallet={wallet} onClose={() => setShowSendModal(false)} />}

            {wallet && (
                <div style={styles.content}>
                    <div style={styles.header}>
                        <h1 style={styles.title}>Hello{username ? `, ${username}` : ', anonymous'}</h1>
                        {!username && (
                            <button
                                onClick={startClaimingUsername}
                                style={{
                                    background: 'linear-gradient(135deg, #ffd700 0%, #ffb700 100%)',
                                    color: '#2d3748',
                                    border: 'none',
                                    borderRadius: '16px',
                                    padding: '12px 24px',
                                    fontSize: '16px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    marginTop: '16px',
                                    boxShadow: '0 8px 25px rgba(255, 215, 0, 0.4)',
                                    textTransform: 'uppercase' as const,
                                    letterSpacing: '1px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    alignSelf: 'center',
                                    transform: 'translateY(0px)',
                                }}
                                onMouseOver={e => {
                                    const target = e.target as HTMLButtonElement;
                                    target.style.transform = 'translateY(-3px) scale(1.05)';
                                    target.style.boxShadow = '0 12px 35px rgba(255, 215, 0, 0.6)';
                                    target.style.background = 'linear-gradient(135deg, #ffed4e 0%, #ff9800 100%)';
                                }}
                                onMouseOut={e => {
                                    const target = e.target as HTMLButtonElement;
                                    target.style.transform = 'translateY(0px) scale(1)';
                                    target.style.boxShadow = '0 8px 25px rgba(255, 215, 0, 0.4)';
                                    target.style.background = 'linear-gradient(135deg, #ffd700 0%, #ffb700 100%)';
                                }}
                            >
                                🌟 Claim Username
                            </button>
                        )}
                    </div>

                    <div
                        style={{
                            ...styles.balanceCard,
                            ...(balance !== null && {
                                transform: 'translateY(-5px)',
                                boxShadow: '0 25px 70px rgba(0, 0, 0, 0.2)',
                            }),
                        }}
                    >
                        <div style={styles.balanceLabel}>⚡ Lightning Balance</div>

                        {balance !== null ? (
                            <>
                                <div style={styles.balanceAmount}>{formatBalance(balance)}</div>
                                <div style={styles.balanceUnit}>Satoshis</div>
                            </>
                        ) : (
                            <div style={{ fontSize: '36px', color: '#667eea', fontWeight: '600' }}>🔄 Loading balance...</div>
                        )}

                        <div style={styles.buttonContainer}>
                            <button
                                className="action-button receive-button"
                                style={{
                                    ...styles.actionButton,
                                    ...styles.receiveButton,
                                }}
                                onClick={() => {
                                    if (username) {
                                        console.log('username', username);
                                        window.open(`/@${username}`, '_blank');
                                    } else {
                                        startClaimingUsername();
                                    }
                                }}
                            >
                                ⬇️ Receive
                            </button>

                            <button
                                className="action-button send-button"
                                style={{
                                    ...styles.actionButton,
                                    ...styles.sendButton,
                                }}
                                onClick={() => setShowSendModal(true)}
                            >
                                ⬆️ Send
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>
                {`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    
                    @keyframes shimmer {
                        0% { background-position: 0% 0%, -200% 0%; }
                        50% { background-position: 0% 0%, 200% 0%; }
                        100% { background-position: 0% 0%, -200% 0%; }
                    }
                    
                    @keyframes sparkle {
                        0%, 100% { 
                            box-shadow: 0 6px 25px rgba(255, 255, 255, 0.8), 
                                       0 0 20px rgba(255, 215, 0, 0.3), 
                                       inset 0 1px 3px rgba(255, 255, 255, 0.5),
                                       2px 2px 4px rgba(255, 215, 0, 0.4),
                                       -2px -2px 4px rgba(255, 215, 0, 0.4);
                        }
                        50% { 
                            box-shadow: 0 8px 30px rgba(255, 255, 255, 1), 
                                       0 0 25px rgba(255, 215, 0, 0.5), 
                                       inset 0 2px 5px rgba(255, 255, 255, 0.8),
                                       3px 3px 6px rgba(255, 215, 0, 0.6),
                                       -3px -3px 6px rgba(255, 215, 0, 0.6);
                        }
                    }
                    
                    .balance-card:hover {
                        transform: translateY(-5px) !important;
                        box-shadow: 0 25px 70px rgba(0, 0, 0, 0.2) !important;
                    }
                    
                    .stat-card:hover {
                        transform: translateY(-2px);
                    }
                    
                    .action-button:hover {
                        transform: translateY(-3px) scale(1.02);
                    }
                    
                    .receive-button:hover {
                        background: linear-gradient(135deg, #ffffff 0%, #fffbf0 50%, #ffffff 100%), linear-gradient(45deg, transparent 20%, rgba(255, 215, 0, 0.3) 50%, transparent 80%) !important;
                        background-size: 100% 100%, 150% 150% !important;
                        box-shadow: 0 10px 35px rgba(255, 255, 255, 1), 0 0 30px rgba(255, 215, 0, 0.6), inset 0 2px 5px rgba(255, 255, 255, 0.8) !important;
                        border-color: rgba(255, 215, 0, 0.5) !important;
                        animation: sparkle 2s ease-in-out infinite, shimmer 2s ease-in-out infinite !important;
                    }
                    
                    .send-button:hover {
                        background: linear-gradient(135deg, #ffffff 0%, #faf5ff 50%, #ffffff 100%), linear-gradient(45deg, transparent 20%, rgba(138, 43, 226, 0.3) 50%, transparent 80%) !important;
                        background-size: 100% 100%, 150% 150% !important;
                        box-shadow: 0 10px 35px rgba(255, 255, 255, 1), 0 0 30px rgba(138, 43, 226, 0.6), inset 0 2px 5px rgba(255, 255, 255, 0.8) !important;
                        border-color: rgba(138, 43, 226, 0.5) !important;
                        animation: sparkle 2s ease-in-out infinite, shimmer 2s ease-in-out infinite !important;
                    }
                    
                    .refresh-button:hover {
                        background: rgba(255, 255, 255, 0.2) !important;
                        transform: translateY(-1px);
                        border-color: rgba(255, 255, 255, 0.5) !important;
                    }
                `}
            </style>
        </div>
    );
}
