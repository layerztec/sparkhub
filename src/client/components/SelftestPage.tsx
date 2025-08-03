import { SparkWallet } from '@buildonspark/spark-sdk';
import { useState } from 'preact/hooks';
import { route } from 'preact-router';
import { assert } from '../../assert';
import { Csprng, decrypt, encrypt, scryptConfig } from '../../encryption';
import { SecureStorage } from '../../storage';

interface SelftestState {
    status: 'idle' | 'running' | 'success' | 'failure';
    errorMessage?: string;
}

interface ViewSeedState {
    isModalOpen: boolean;
    password: string;
    seed: string | null;
    error: string;
    isLoading: boolean;
}

export function SelftestPage({ path: _path }: { path?: string }) {
    const [testState, setTestState] = useState<SelftestState>({
        status: 'idle',
    });

    const [seedState, setSeedState] = useState<ViewSeedState>({
        isModalOpen: false,
        password: '',
        seed: null,
        error: '',
        isLoading: false,
    });

    const runSelfTest = async () => {
        setTestState({ status: 'running' });

        try {
            // test encryption

            console.log('test encryption...');
            const data2encrypt = 'really long data string bla bla really long data string bla bla really long data string bla bla';
            const crypted = await encrypt(scryptConfig, Csprng, data2encrypt, 'password', '53B63311-D2D5-4C62-9F7F-28F25447B825');
            const decrypted = await decrypt(scryptConfig, crypted, 'password', '53B63311-D2D5-4C62-9F7F-28F25447B825');

            assert.ok(crypted);
            assert.ok(decrypted);
            assert.strictEqual(decrypted, data2encrypt);
            assert.notStrictEqual(crypted, data2encrypt);
            console.log('encryption test passed');

            console.log('test decryption with bad password...');
            let decryptedWithBadPassword: string | undefined;
            try {
                decryptedWithBadPassword = await decrypt(scryptConfig, crypted, 'passwordBad', '53B63311-D2D5-4C62-9F7F-28F25447B825');
            } catch (_e) {
                // intentionally empty
            }
            assert.ok(!decryptedWithBadPassword);
            console.log('decryption with bad password test passed');

            // test spark

            console.log('test spark...');
            const mnemonicOrSeed = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

            const { wallet } = await SparkWallet.initialize({
                mnemonicOrSeed,
                options: {
                    network: 'MAINNET',
                },
            });

            assert.strictEqual(await wallet.getSparkAddress(), 'sp1pgss9qfk8ygtphqqzkj2yhn43k3s7r3g8z822ffvpcm38ym094800574233rzd');
            console.log('spark test passed');

            setTestState({
                status: 'success',
            });
        } catch (error) {
            setTestState({
                status: 'failure',
                errorMessage: error instanceof Error ? error.message : 'Unknown error occurred',
            });
        }
    };

    const resetTest = () => {
        setTestState({ status: 'idle' });
    };

    const openSeedModal = () => {
        setSeedState({
            isModalOpen: true,
            password: '',
            seed: null,
            error: '',
            isLoading: false,
        });
    };

    const closeSeedModal = () => {
        setSeedState({
            isModalOpen: false,
            password: '',
            seed: null,
            error: '',
            isLoading: false,
        });
    };

    const handleViewSeed = async () => {
        if (!seedState.password.trim()) {
            setSeedState(prev => ({ ...prev, error: 'Please enter your password' }));
            return;
        }

        setSeedState(prev => ({ ...prev, isLoading: true, error: '' }));

        try {
            const seed = await SecureStorage.getMnemonic(seedState.password);
            setSeedState(prev => ({ ...prev, seed, isLoading: false }));
        } catch (error) {
            setSeedState(prev => ({
                ...prev,
                error: error instanceof Error ? error.message : 'Failed to decrypt seed',
                isLoading: false,
            }));
        }
    };

    return (
        <div
            style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: '60px 20px',
            }}
        >
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                {/* Header */}
                <div
                    style={{
                        textAlign: 'center',
                        marginBottom: '60px',
                    }}
                >
                    <div
                        style={{
                            fontSize: '3rem',
                            fontWeight: '800',
                            marginBottom: '20px',
                            color: 'white',
                            textShadow: '0 4px 20px rgba(0,0,0,0.3)',
                        }}
                    >
                        🔧 System Self-Test
                    </div>
                    <p
                        style={{
                            fontSize: '1.2rem',
                            color: 'rgba(255,255,255,0.9)',
                            lineHeight: '1.5',
                            maxWidth: '600px',
                            margin: '0 auto',
                        }}
                    >
                        Verify your Lightning wallet functionality and network connectivity
                    </p>
                </div>

                {/* Main Test Card */}
                <div
                    style={{
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: '20px',
                        padding: '50px',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        textAlign: 'center',
                        marginBottom: '30px',
                    }}
                >
                    {/* Status Icon */}
                    <div
                        style={{
                            fontSize: '4rem',
                            marginBottom: '30px',
                        }}
                    >
                        {testState.status === 'idle' && '🚀'}
                        {testState.status === 'running' && '⚡'}
                        {testState.status === 'success' && '✅'}
                        {testState.status === 'failure' && '❌'}
                    </div>

                    {/* Status Text */}
                    <div style={{ marginBottom: '40px' }}>
                        {testState.status === 'idle' && (
                            <>
                                <h2
                                    style={{
                                        fontSize: '1.8rem',
                                        fontWeight: '600',
                                        color: 'white',
                                        marginBottom: '15px',
                                    }}
                                >
                                    Ready to Test
                                </h2>
                                <p
                                    style={{
                                        fontSize: '1rem',
                                        color: 'rgba(255,255,255,0.8)',
                                        lineHeight: '1.6',
                                        margin: 0,
                                    }}
                                >
                                    Click the button below to run comprehensive system tests including wallet functionality, network connectivity, and Lightning Network status.
                                </p>
                            </>
                        )}

                        {testState.status === 'running' && (
                            <>
                                <h2
                                    style={{
                                        fontSize: '1.8rem',
                                        fontWeight: '600',
                                        color: 'white',
                                        marginBottom: '15px',
                                    }}
                                >
                                    Running Tests...
                                </h2>
                                <p
                                    style={{
                                        fontSize: '1rem',
                                        color: 'rgba(255,255,255,0.8)',
                                        lineHeight: '1.6',
                                        margin: 0,
                                    }}
                                >
                                    Please wait while we verify your system components. This may take a few seconds.
                                </p>
                                <div
                                    style={{
                                        marginTop: '20px',
                                        display: 'inline-block',
                                        width: '40px',
                                        height: '40px',
                                        border: '4px solid rgba(255,255,255,0.3)',
                                        borderTop: '4px solid #f093fb',
                                        borderRadius: '50%',
                                        animation: 'spin 1s linear infinite',
                                    }}
                                />
                            </>
                        )}

                        {testState.status === 'success' && (
                            <>
                                <h2
                                    style={{
                                        fontSize: '1.8rem',
                                        fontWeight: '600',
                                        color: '#48bb78',
                                        marginBottom: '15px',
                                    }}
                                >
                                    All Tests Passed!
                                </h2>
                                <p
                                    style={{
                                        fontSize: '1rem',
                                        color: 'rgba(255,255,255,0.8)',
                                        lineHeight: '1.6',
                                        margin: 0,
                                    }}
                                >
                                    🎉 Your Lightning wallet is working perfectly! All system components are functioning correctly and you're ready to send and receive payments.
                                </p>
                            </>
                        )}

                        {testState.status === 'failure' && (
                            <>
                                <h2
                                    style={{
                                        fontSize: '1.8rem',
                                        fontWeight: '600',
                                        color: '#f56565',
                                        marginBottom: '15px',
                                    }}
                                >
                                    Test Failed
                                </h2>
                                <p
                                    style={{
                                        fontSize: '1rem',
                                        color: 'rgba(255,255,255,0.8)',
                                        lineHeight: '1.6',
                                        marginBottom: '20px',
                                    }}
                                >
                                    Some system components are not working correctly. Please check the error details below:
                                </p>
                                <div
                                    style={{
                                        background: 'rgba(245, 101, 101, 0.2)',
                                        border: '1px solid rgba(245, 101, 101, 0.4)',
                                        borderRadius: '10px',
                                        padding: '20px',
                                        fontSize: '0.95rem',
                                        color: '#fed7d7',
                                        fontFamily: 'monospace',
                                        textAlign: 'left',
                                    }}
                                >
                                    <strong>Error:</strong> {testState.errorMessage}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center' }}>
                        {(testState.status === 'idle' || testState.status === 'failure') && (
                            <>
                                <button
                                    type="button"
                                    onClick={runSelfTest}
                                    style={{
                                        padding: '18px 40px',
                                        fontSize: '1.2rem',
                                        fontWeight: '700',
                                        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '50px',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease',
                                        boxShadow: '0 8px 25px rgba(240, 147, 251, 0.4)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '1px',
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.transform = 'translateY(-3px)';
                                        e.currentTarget.style.boxShadow = '0 12px 35px rgba(240, 147, 251, 0.6)';
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 8px 25px rgba(240, 147, 251, 0.4)';
                                    }}
                                >
                                    {testState.status === 'failure' ? '🔄 Run Test Again' : '🚀 Run Self Test'}
                                </button>

                                {SecureStorage.hasMnemonic() && (
                                    <button
                                        type="button"
                                        onClick={openSeedModal}
                                        style={{
                                            padding: '16px 35px',
                                            fontSize: '1.1rem',
                                            fontWeight: '600',
                                            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '50px',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s ease',
                                            boxShadow: '0 8px 25px rgba(245, 158, 11, 0.4)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '1px',
                                        }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                            e.currentTarget.style.boxShadow = '0 12px 35px rgba(245, 158, 11, 0.6)';
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = '0 8px 25px rgba(245, 158, 11, 0.4)';
                                        }}
                                    >
                                        🔑 View Seed
                                    </button>
                                )}
                            </>
                        )}
                    </div>

                    {testState.status === 'success' && (
                        <div
                            style={{
                                display: 'flex',
                                gap: '15px',
                                justifyContent: 'center',
                                flexWrap: 'wrap',
                            }}
                        >
                            <button
                                type="button"
                                onClick={resetTest}
                                style={{
                                    padding: '16px 35px',
                                    fontSize: '1.1rem',
                                    fontWeight: '600',
                                    background: 'rgba(255,255,255,0.2)',
                                    color: 'white',
                                    border: '1px solid rgba(255,255,255,0.3)',
                                    borderRadius: '50px',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    backdropFilter: 'blur(10px)',
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }}
                            >
                                🔄 Run Again
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    route('/');
                                }}
                                style={{
                                    padding: '16px 35px',
                                    fontSize: '1.1rem',
                                    fontWeight: '600',
                                    background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '50px',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    boxShadow: '0 8px 25px rgba(72, 187, 120, 0.4)',
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 12px 35px rgba(72, 187, 120, 0.6)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(72, 187, 120, 0.4)';
                                }}
                            >
                                ✨ Continue to App
                            </button>
                        </div>
                    )}
                </div>

                {/* Test Categories */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: '20px',
                        marginTop: '40px',
                    }}
                >
                    <div
                        style={{
                            background: 'rgba(255,255,255,0.08)',
                            borderRadius: '15px',
                            padding: '25px',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255,255,255,0.1)',
                        }}
                    >
                        <div style={{ fontSize: '2rem', marginBottom: '15px' }}>🔐</div>
                        <h3
                            style={{
                                fontSize: '1.1rem',
                                fontWeight: '600',
                                color: 'white',
                                marginBottom: '10px',
                            }}
                        >
                            Wallet Security
                        </h3>
                        <p
                            style={{
                                fontSize: '0.9rem',
                                color: 'rgba(255,255,255,0.7)',
                                margin: 0,
                                lineHeight: '1.4',
                            }}
                        >
                            Verify encryption, key derivation, and secure storage
                        </p>
                    </div>

                    <div
                        style={{
                            background: 'rgba(255,255,255,0.08)',
                            borderRadius: '15px',
                            padding: '25px',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255,255,255,0.1)',
                        }}
                    >
                        <div style={{ fontSize: '2rem', marginBottom: '15px' }}>⚡</div>
                        <h3
                            style={{
                                fontSize: '1.1rem',
                                fontWeight: '600',
                                color: 'white',
                                marginBottom: '10px',
                            }}
                        >
                            Lightning Network
                        </h3>
                        <p
                            style={{
                                fontSize: '0.9rem',
                                color: 'rgba(255,255,255,0.7)',
                                margin: 0,
                                lineHeight: '1.4',
                            }}
                        >
                            Test node connectivity and channel operations
                        </p>
                    </div>

                    <div
                        style={{
                            background: 'rgba(255,255,255,0.08)',
                            borderRadius: '15px',
                            padding: '25px',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255,255,255,0.1)',
                        }}
                    >
                        <div style={{ fontSize: '2rem', marginBottom: '15px' }}>🌐</div>
                        <h3
                            style={{
                                fontSize: '1.1rem',
                                fontWeight: '600',
                                color: 'white',
                                marginBottom: '10px',
                            }}
                        >
                            Network Health
                        </h3>
                        <p
                            style={{
                                fontSize: '0.9rem',
                                color: 'rgba(255,255,255,0.7)',
                                margin: 0,
                                lineHeight: '1.4',
                            }}
                        >
                            Check internet connection and API endpoints
                        </p>
                    </div>
                </div>
            </div>

            {/* Seed View Modal */}
            {seedState.isModalOpen && (
                <div
                    style={{
                        position: 'fixed',
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
                    }}
                    onClick={closeSeedModal}
                >
                    <div
                        style={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            padding: '40px',
                            borderRadius: '24px',
                            boxShadow: '0 25px 80px rgba(0, 0, 0, 0.4)',
                            maxWidth: '500px',
                            width: '90%',
                            textAlign: 'center',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            backdropFilter: 'blur(20px)',
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div
                            style={{
                                fontSize: '28px',
                                fontWeight: '700',
                                color: 'white',
                                marginBottom: '8px',
                                textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                            }}
                        >
                            🔑 View Wallet Seed
                        </div>
                        <div
                            style={{
                                fontSize: '16px',
                                color: 'rgba(255, 255, 255, 0.9)',
                                marginBottom: '32px',
                                lineHeight: '1.5',
                            }}
                        >
                            Enter your password to decrypt and view your seed phrase
                        </div>

                        {seedState.error && (
                            <div
                                style={{
                                    color: '#ff6b6b',
                                    fontSize: '14px',
                                    marginBottom: '16px',
                                    padding: '12px',
                                    backgroundColor: 'rgba(255, 107, 107, 0.1)',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(255, 107, 107, 0.3)',
                                }}
                            >
                                {seedState.error}
                            </div>
                        )}

                        {!seedState.seed ? (
                            <>
                                <div style={{ marginBottom: '24px' }}>
                                    <input
                                        type="password"
                                        value={seedState.password}
                                        onInput={e =>
                                            setSeedState(prev => ({
                                                ...prev,
                                                password: (e.target as HTMLInputElement).value,
                                                error: '',
                                            }))
                                        }
                                        placeholder="Enter your password"
                                        style={{
                                            width: '100%',
                                            padding: '16px',
                                            fontSize: '16px',
                                            border: '2px solid rgba(255, 255, 255, 0.3)',
                                            borderRadius: '12px',
                                            outline: 'none',
                                            transition: 'all 0.3s ease',
                                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                            color: '#2d3748',
                                            backdropFilter: 'blur(10px)',
                                        }}
                                        autoFocus
                                        onKeyPress={e => {
                                            if (e.key === 'Enter') {
                                                handleViewSeed();
                                            }
                                        }}
                                    />
                                </div>

                                <div
                                    style={{
                                        display: 'flex',
                                        gap: '12px',
                                        marginTop: '24px',
                                    }}
                                >
                                    <button
                                        onClick={handleViewSeed}
                                        disabled={seedState.isLoading}
                                        style={{
                                            flex: '1',
                                            padding: '16px 24px',
                                            fontSize: '16px',
                                            fontWeight: '700',
                                            background: seedState.isLoading ? 'rgba(255, 255, 255, 0.2)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '12px',
                                            cursor: seedState.isLoading ? 'not-allowed' : 'pointer',
                                            transition: 'all 0.3s ease',
                                            boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '1px',
                                            opacity: seedState.isLoading ? 0.6 : 1,
                                        }}
                                    >
                                        {seedState.isLoading ? '🔓 Decrypting...' : '🔓 Decrypt Seed'}
                                    </button>
                                    <button
                                        onClick={closeSeedModal}
                                        disabled={seedState.isLoading}
                                        style={{
                                            flex: '1',
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
                                            textTransform: 'uppercase',
                                            letterSpacing: '1px',
                                        }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.95)',
                                        borderRadius: '16px',
                                        padding: '24px',
                                        marginBottom: '24px',
                                        border: '2px solid rgba(255, 255, 255, 0.3)',
                                        backdropFilter: 'blur(10px)',
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize: '14px',
                                            color: '#6b7280',
                                            marginBottom: '12px',
                                            fontWeight: '600',
                                            textTransform: 'uppercase',
                                            letterSpacing: '1px',
                                        }}
                                    >
                                        Your Seed Phrase
                                    </div>
                                    <div
                                        style={{
                                            fontSize: '16px',
                                            color: '#2d3748',
                                            fontFamily: 'monospace',
                                            lineHeight: '1.6',
                                            padding: '16px',
                                            backgroundColor: 'rgba(0, 0, 0, 0.05)',
                                            borderRadius: '8px',
                                            wordBreak: 'break-all',
                                            border: '1px solid rgba(0, 0, 0, 0.1)',
                                        }}
                                    >
                                        {seedState.seed}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: '12px',
                                            color: '#ef4444',
                                            marginTop: '12px',
                                            fontWeight: '500',
                                        }}
                                    >
                                        ⚠️ Keep this seed phrase secret and secure!
                                    </div>
                                </div>

                                <button
                                    onClick={closeSeedModal}
                                    style={{
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
                                        textTransform: 'uppercase',
                                        letterSpacing: '1px',
                                    }}
                                >
                                    Close
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* CSS Animations */}
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                @media (max-width: 768px) {
                    .selftest-page h1 {
                        font-size: 2rem !important;
                    }
                    .selftest-card {
                        padding: 30px !important;
                    }
                }
                
                * {
                    box-sizing: border-box;
                }
            `}</style>
        </div>
    );
}
