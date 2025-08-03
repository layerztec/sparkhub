import { SparkWallet } from '@buildonspark/spark-sdk';
import { useContext, useEffect, useState } from 'preact/hooks';
import { route } from 'preact-router';
import { assert } from '../../assert';
import { hashString } from '../../encryption';
import { PasswordContext } from '../../password-context';
import { SecureStorage } from '../../storage';

type LoginStep = 'initial' | 'existing' | 'new';

export function LoginPage({ path: _path }: { path?: string }) {
    const { password: passwordInContext, setPassword: setPasswordInContext } = useContext(PasswordContext);
    const [step, setStep] = useState<LoginStep>('initial');
    const [seedPhrase, setSeedPhrase] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [generatedMnemonic, setGeneratedMnemonic] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

    // Check if mnemonic already exists and redirect to dashboard
    useEffect(() => {
        if (SecureStorage.hasMnemonic()) {
            route('/dashboard');
        }
    }, []);

    // Password validation
    const validatePassword = (pwd: string, confirmPwd: string): string[] => {
        const errors: string[] = [];

        if (pwd.length < 8) {
            errors.push('Password must be at least 8 characters long');
        }

        if (pwd !== confirmPwd && confirmPwd !== '') {
            errors.push('Passwords do not match');
        }

        return errors;
    };

    const handlePasswordChange = (pwd: string) => {
        setPassword(pwd);
        setPasswordErrors(validatePassword(pwd, confirmPassword));
    };

    const handleConfirmPasswordChange = (confirmPwd: string) => {
        setConfirmPassword(confirmPwd);
        setPasswordErrors(validatePassword(password, confirmPwd));
    };

    const isPasswordValid = password.length >= 8 && password === confirmPassword && confirmPassword !== '';

    const renderPasswordForm = () => (
        <div>
            <div style={styles.formGroup}>
                <div style={styles.label}>Create Password</div>
                <div style={styles.passwordInputWrapper}>
                    <input
                        type="password"
                        value={password}
                        onInput={e => handlePasswordChange((e.target as HTMLInputElement).value)}
                        placeholder="Enter a secure password..."
                        style={{
                            ...styles.input,
                            borderColor: password ? (passwordErrors.length > 0 ? '#ff6b6b' : '#51cf66') : 'rgba(255, 255, 255, 0.3)',
                            marginBottom: '8px',
                        }}
                        onFocus={e => {
                            e.currentTarget.style.borderColor = '#667eea';
                            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                        }}
                        onBlur={e => {
                            const hasErrors = passwordErrors.length > 0;
                            e.currentTarget.style.borderColor = password ? (hasErrors ? '#ff6b6b' : '#51cf66') : 'rgba(255, 255, 255, 0.3)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    />
                    {password && (
                        <div style={styles.passwordStrengthBar}>
                            <div
                                style={{
                                    ...styles.passwordStrengthFill,
                                    width: `${Math.min((password.length / 12) * 100, 100)}%`,
                                    backgroundColor: password.length < 8 ? '#ff6b6b' : password.length < 12 ? '#ffd93d' : '#51cf66',
                                }}
                            />
                        </div>
                    )}
                </div>

                <div style={styles.label}>Confirm Password</div>
                <div style={styles.passwordInputWrapper}>
                    <input
                        type="password"
                        value={confirmPassword}
                        onInput={e => handleConfirmPasswordChange((e.target as HTMLInputElement).value)}
                        placeholder="Confirm your password..."
                        style={{
                            ...styles.input,
                            borderColor: confirmPassword ? (password === confirmPassword ? '#51cf66' : '#ff6b6b') : 'rgba(255, 255, 255, 0.3)',
                            marginBottom: passwordErrors.length > 0 ? '8px' : '20px',
                        }}
                        onFocus={e => {
                            e.currentTarget.style.borderColor = '#667eea';
                            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                        }}
                        onBlur={e => {
                            e.currentTarget.style.borderColor = confirmPassword ? (password === confirmPassword ? '#51cf66' : '#ff6b6b') : 'rgba(255, 255, 255, 0.3)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    />
                    {confirmPassword && password === confirmPassword && <div style={styles.successMessage}>✓ Passwords match</div>}
                </div>

                {passwordErrors.map((error, index) => (
                    <div key={index} style={styles.errorMessage}>
                        ⚠️ {error}
                    </div>
                ))}
            </div>

            <button
                type="submit"
                disabled={!isPasswordValid}
                style={{
                    ...styles.buttonPrimary,
                    opacity: isPasswordValid ? 1 : 0.6,
                    cursor: isPasswordValid ? 'pointer' : 'not-allowed',
                    background: isPasswordValid ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.8) 100%)' : 'rgba(255, 255, 255, 0.5)',
                }}
                onMouseEnter={e => {
                    if (isPasswordValid) {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 8px 30px rgba(102, 126, 234, 0.4)';
                    }
                }}
                onMouseLeave={e => {
                    if (isPasswordValid) {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.1)';
                    }
                }}
            >
                {isLoading ? '🔄 Setting up account...' : '🚀 Complete Setup'}
            </button>
        </div>
    );

    const generateNewWallet = async () => {
        try {
            const { mnemonic } = await SparkWallet.initialize({
                options: {
                    network: 'MAINNET',
                },
            });

            assert.ok(mnemonic, 'Seed generation failed');
            setGeneratedMnemonic(mnemonic);
        } catch (error) {
            setMessage(`Error generating wallet: ${error}`);
            console.error(error);
        }
    };

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');

        try {
            if (generatedMnemonic && password) {
                await SecureStorage.saveMnemonic(generatedMnemonic, password);
                setPasswordInContext(password);
                // await new Promise(resolve => setTimeout(resolve, 500)); // propagate
                route('/dashboard');
            }

            if (seedPhrase && password) {
                // check if seed phrase is valid
                const { wallet } = await SparkWallet.initialize({
                    mnemonicOrSeed: seedPhrase,
                    options: {
                        network: 'MAINNET',
                    },
                });

                await SecureStorage.saveMnemonic(seedPhrase, password);
                setPasswordInContext(password);
                await wallet.cleanupConnections();

                // await new Promise(resolve => setTimeout(resolve, 500)); // propagate
                route('/dashboard');
            }
        } catch (error) {
            setMessage(`Error: Seed phrase is invalid`);
            console.warn(error);
        } finally {
            setIsLoading(false);
        }
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
            maxWidth: '500px',
            width: '100%',
            textAlign: 'center' as const,
        },
        title: {
            fontSize: '32px',
            fontWeight: '700',
            color: 'white',
            textAlign: 'center' as const,
            marginBottom: '8px',
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        },
        subtitle: {
            fontSize: '18px',
            color: 'rgba(255, 255, 255, 0.9)',
            textAlign: 'center' as const,
            marginBottom: '32px',
            lineHeight: '1.5',
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
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
            marginBottom: '16px',
            position: 'relative' as const,
            overflow: 'hidden',
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
            marginBottom: '16px',
            backdropFilter: 'blur(10px)',
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
        textarea: {
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
            minHeight: '120px',
            resize: 'vertical' as const,
            fontFamily: 'inherit',
            backdropFilter: 'blur(10px)',
        },
        label: {
            display: 'block',
            marginBottom: '8px',
            fontSize: '15px',
            fontWeight: '600',
            color: 'white',
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
        },
        message: {
            marginTop: '16px',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            textAlign: 'center' as const,
        },
        backLink: {
            display: 'block',
            textAlign: 'center' as const,
            marginTop: '20px',
            color: '#667eea',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'color 0.3s ease',
        },
        stepIndicator: {
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '24px',
        },
        stepDot: {
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            margin: '0 8px',
            transition: 'all 0.3s ease',
            border: '2px solid rgba(255, 255, 255, 0.3)',
        },
        formGroup: {
            marginBottom: '24px',
        },
        helpText: {
            fontSize: '14px',
            color: 'rgba(255, 255, 255, 0.8)',
            marginTop: '8px',
            lineHeight: '1.4',
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
        },
        errorMessage: {
            fontSize: '13px',
            color: '#ff6b6b',
            marginTop: '4px',
            fontWeight: '500',
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
        },
        successMessage: {
            fontSize: '13px',
            color: '#51cf66',
            marginTop: '4px',
            fontWeight: '500',
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
        },
        passwordInputWrapper: {
            position: 'relative' as const,
            marginBottom: '16px',
        },
        passwordStrengthBar: {
            height: '3px',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '2px',
            marginTop: '8px',
            overflow: 'hidden',
        },
        passwordStrengthFill: {
            height: '100%',
            transition: 'width 0.3s ease, background-color 0.3s ease',
            borderRadius: '2px',
        },
    };

    const renderInitialStep = () => (
        <div style={{ textAlign: 'center' }}>
            <div style={styles.stepIndicator}>
                <div style={{ ...styles.stepDot, backgroundColor: '#667eea' }}></div>
                <div style={{ ...styles.stepDot, backgroundColor: '#e2e8f0' }}></div>
                <div style={{ ...styles.stepDot, backgroundColor: '#e2e8f0' }}></div>
            </div>

            <h1 style={styles.title}>Welcome to Layerz.me</h1>
            <p style={styles.subtitle}>Your browser Lightning Wallet</p>

            <div style={{ marginBottom: '18px' }}>
                <button
                    type="button"
                    style={styles.buttonPrimary}
                    onClick={() => setStep('existing')}
                    onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 8px 30px rgba(102, 126, 234, 0.4)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                    }}
                >
                    🔑 I have a seed phrase
                </button>

                <button
                    type="button"
                    style={styles.buttonSecondary}
                    onClick={() => setStep('new')}
                    onMouseEnter={e => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.6)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
                        e.currentTarget.style.transform = 'translateY(0)';
                    }}
                >
                    ✨ Create new account
                </button>
            </div>

            <div
                style={{
                    fontSize: '14px',
                    color: 'rgba(255, 255, 255, 0.8)',
                    lineHeight: '1.5',
                    textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                }}
            >
                <p style={{ margin: '8px 0' }}>🔒 Your data is encrypted and stored securely in browser (not on server)</p>
                <p style={{ margin: '8px 0' }}>⚡ Lightning-fast payments with your custom address</p>
            </div>
        </div>
    );

    const renderExistingUserForm = () => (
        <div>
            <div style={styles.stepIndicator}>
                <div style={{ ...styles.stepDot, backgroundColor: '#48bb78' }}></div>
                <div style={{ ...styles.stepDot, backgroundColor: '#667eea' }}></div>
                <div style={{ ...styles.stepDot, backgroundColor: '#e2e8f0' }}></div>
            </div>

            <button
                type="button"
                onClick={() => setStep('initial')}
                style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    color: 'white',
                    fontSize: '14px',
                    cursor: 'pointer',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    transition: 'all 0.3s ease',
                    backdropFilter: 'blur(10px)',
                }}
            >
                ← Back
            </button>

            <h1 style={styles.title}>Welcome Back</h1>
            <p style={styles.subtitle}>Enter your seed phrase to restore your account</p>

            <form onSubmit={handleSubmit}>
                <div style={styles.formGroup}>
                    <div style={styles.label}>Seed Phrase</div>
                    <textarea
                        value={seedPhrase}
                        onInput={e => setSeedPhrase((e.target as HTMLTextAreaElement).value)}
                        placeholder="Enter your 12 or 24 word seed phrase..."
                        required
                        style={{
                            ...styles.textarea,
                            borderColor: seedPhrase ? '#48bb78' : '#e2e8f0',
                        }}
                        onFocus={e => {
                            e.currentTarget.style.borderColor = '#667eea';
                            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                        }}
                        onBlur={e => {
                            e.currentTarget.style.borderColor = seedPhrase ? '#48bb78' : '#e2e8f0';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    />
                    <div style={styles.helpText}>Enter each word separated by spaces. Your seed phrase is never stored on our servers.</div>
                </div>

                {seedPhrase.trim() && (
                    <div style={{ marginTop: '24px' }}>
                        <div style={{ ...styles.title, fontSize: '20px', marginBottom: '16px' }}>🔐 Secure Your Account</div>
                        <div style={{ ...styles.subtitle, fontSize: '14px', marginBottom: '20px' }}>Create a password to encrypt your data locally</div>
                        {renderPasswordForm()}
                    </div>
                )}

                {!seedPhrase.trim() && (
                    <button
                        type="button"
                        disabled={true}
                        style={{
                            ...styles.buttonPrimary,
                            opacity: 0.6,
                            cursor: 'not-allowed',
                        }}
                    >
                        Enter seed phrase to continue
                    </button>
                )}
            </form>
        </div>
    );

    const renderNewUserForm = () => {
        // Generate mnemonic if not already generated
        if (!generatedMnemonic) {
            generateNewWallet();
        }

        return (
            <div>
                <div style={styles.stepIndicator}>
                    <div
                        style={{
                            ...styles.stepDot,
                            backgroundColor: '#48bb78',
                        }}
                    ></div>
                    <div
                        style={{
                            ...styles.stepDot,
                            backgroundColor: '#48bb78',
                        }}
                    ></div>
                    <div
                        style={{
                            ...styles.stepDot,
                            backgroundColor: '#667eea',
                        }}
                    ></div>
                </div>

                <button
                    type="button"
                    onClick={() => setStep('initial')}
                    style={{
                        background: 'rgba(255, 255, 255, 0.2)',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        color: 'white',
                        fontSize: '14px',
                        cursor: 'pointer',
                        marginBottom: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        transition: 'all 0.3s ease',
                        backdropFilter: 'blur(10px)',
                    }}
                >
                    ← Back
                </button>

                <h1 style={styles.title}>Your New Wallet</h1>
                <p style={styles.subtitle}>Write down this seed phrase and keep it safe</p>

                {generatedMnemonic && (
                    <div>
                        <div
                            style={{
                                background: 'rgba(255, 255, 255, 0.15)',
                                border: '2px solid rgba(255, 255, 255, 0.3)',
                                borderRadius: '12px',
                                padding: '20px',
                                marginBottom: '24px',
                                backdropFilter: 'blur(10px)',
                            }}
                        >
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(3, 1fr)',
                                    gap: '12px',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                }}
                            >
                                {generatedMnemonic.split(' ').map((word, index) => (
                                    <div
                                        key={hashString(word, String(index))}
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.9)',
                                            color: '#2d3748',
                                            padding: '8px 12px',
                                            borderRadius: '8px',
                                            textAlign: 'center',
                                            fontSize: '13px',
                                            fontWeight: '600',
                                        }}
                                    >
                                        <span
                                            style={{
                                                color: '#718096',
                                                fontSize: '10px',
                                            }}
                                        >
                                            {index + 1}.
                                        </span>{' '}
                                        {word}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div
                            style={{
                                background: 'rgba(255, 255, 255, 0.1)',
                                border: '2px solid rgba(255, 255, 255, 0.2)',
                                borderRadius: '12px',
                                padding: '16px',
                                marginBottom: '24px',
                                fontSize: '14px',
                                color: 'rgba(255, 255, 255, 0.9)',
                                lineHeight: '1.5',
                                textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                                animation: 'pulse 2s infinite',
                                '@keyframes pulse': {
                                    '0%': {
                                        transform: 'scale(1)',
                                        boxShadow: '0 0 0 0 rgba(255, 255, 255, 0.4)',
                                    },
                                    '70%': {
                                        transform: 'scale(1.02)',
                                        boxShadow: '0 0 0 10px rgba(255, 255, 255, 0)',
                                    },
                                    '100%': {
                                        transform: 'scale(1)',
                                        boxShadow: '0 0 0 0 rgba(255, 255, 255, 0)',
                                    },
                                },
                            }}
                        >
                            <div
                                style={{
                                    marginBottom: '8px',
                                    fontWeight: '600',
                                    animation: 'shake 1.5s infinite',
                                    display: 'inline-block',
                                    '@keyframes shake': {
                                        '0%, 100%': {
                                            transform: 'translateX(0)',
                                        },
                                        '10%, 30%, 50%, 70%, 90%': {
                                            transform: 'translateX(-2px)',
                                        },
                                        '20%, 40%, 60%, 80%': {
                                            transform: 'translateX(2px)',
                                        },
                                    },
                                }}
                            >
                                ⚠️ Important:
                            </div>
                            <div>• Write down these words in order and keep them safe</div>
                            <div>• Never share your seed phrase with anyone</div>
                            <div>• You'll need this to restore your wallet</div>
                            <div>• We cannot recover your wallet without this phrase</div>
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                setShowPasswordForm(true);
                            }}
                            style={{
                                ...styles.buttonPrimary,
                                opacity: 1,
                                cursor: 'pointer',
                            }}
                        >
                            ✅ I've Written It Down - Continue
                        </button>

                        {showPasswordForm && (
                            <div style={{ marginTop: '32px' }}>
                                <div style={{ ...styles.title, fontSize: '20px', marginBottom: '16px' }}>🔐 Secure Your Wallet</div>
                                <div style={{ ...styles.subtitle, fontSize: '14px', marginBottom: '20px' }}>Create a password to encrypt your wallet locally</div>
                                <form onSubmit={handleSubmit}>{renderPasswordForm()}</form>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div style={styles.container}>
            <div style={styles.content}>
                {step === 'initial' && renderInitialStep()}
                {step === 'existing' && renderExistingUserForm()}
                {step === 'new' && renderNewUserForm()}

                {message && (
                    <div
                        style={{
                            ...styles.message,
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            color: message.includes('Success') ? '#22543d' : '#742a2a',
                            border: `2px solid ${message.includes('Success') ? '#48bb78' : '#e53e3e'}`,
                            backdropFilter: 'blur(10px)',
                        }}
                    >
                        {message}
                    </div>
                )}
            </div>
        </div>
    );
}
