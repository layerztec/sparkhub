import { treaty } from '@elysiajs/eden';
import { useEffect, useRef, useState } from 'preact/hooks';
import { route } from 'preact-router';
import QRCode from 'qrcode';
import { config } from '../../config';
import type { App } from '../../index';

export function UserPage({ default: _isDefault }: { default?: boolean }) {
    const [username, setUsername] = useState('');
    const [qrCodeData, setQrCodeData] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [urlCopied, setUrlCopied] = useState(false);
    const [usernameUnclaimed, setUsernameUnclaimed] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Get the path from URL and use it as username
    useEffect(() => {
        const path = window.location.pathname.slice(1).replace('@', ''); // Remove leading slash & "@"
        if (path) {
            setQrCodeData(`${path}@${config.domain}`);
            setUsername(path);
        } else {
            setQrCodeData(`example@${config.domain}`); // Default fallback
            setUsername('example');
        }

        // Simulate loading for a better UX
        setTimeout(() => setIsLoading(false), 800);
    }, []);

    // check whether this username exists in the database
    useEffect(() => {
        if (!username) return;

        const app = treaty<App>(`${config.domain}`);
        app.api
            .users({ username })
            .get()
            .then(response => {
                if (!response.data?.sparkAddress) {
                    setUsernameUnclaimed(true);
                } else {
                    1;
                    document.title = `@${username} — Layerz.me`;
                }
            })
            .catch(error => {
                console.error(error);
            });
    }, [username]);

    useEffect(() => {
        if (canvasRef.current && qrCodeData && !isLoading) {
            QRCode.toCanvas(
                canvasRef.current,
                qrCodeData,
                {
                    width: 220,
                    margin: 3,
                    color: {
                        dark: '#1a1a2e',
                        light: '#FFFFFF',
                    },
                    errorCorrectionLevel: 'M',
                },
                error => {
                    if (error) {
                        console.error('QR Code generation error:', error);
                    }
                }
            );
        }
    }, [qrCodeData, isLoading]);

    // Programmatically add login button to page body after load
    useEffect(() => {
        // Create login button element
        const loginButton = document.createElement('button');
        loginButton.id = 'dynamic-login-btn';
        loginButton.textContent = 'Login';
        loginButton.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            color: rgba(255,255,255,0.8);
            background: transparent;
            border: 1px solid rgba(255,255,255,0.3);
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            padding: 8px 16px;
            cursor: pointer;
            transition: all 0.3s ease;
            z-index: 1000;
            font-family: inherit;
            width: auto;
            max-width: fit-content;
            display: inline-block;
        `;

        // Add hover effects
        loginButton.addEventListener('mouseenter', () => {
            loginButton.style.backgroundColor = 'rgba(255,255,255,0.1)';
            loginButton.style.color = 'white';
        });

        loginButton.addEventListener('mouseleave', () => {
            loginButton.style.backgroundColor = 'transparent';
            loginButton.style.color = 'rgba(255,255,255,0.8)';
        });

        // Add click handler
        loginButton.addEventListener('click', () => {
            route('/login');
        });

        // Add button to body
        document.body.appendChild(loginButton);

        // Cleanup function to remove button when component unmounts
        return () => {
            const existingButton = document.getElementById('dynamic-login-btn');
            if (existingButton) {
                document.body.removeChild(existingButton);
            }
        };
    }, [isLoading]);

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(qrCodeData);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy: ', err);
        }
    };

    const copyPageUrl = async () => {
        try {
            const pageUrl = `${config.domain}/@${username}`;
            await navigator.clipboard.writeText(pageUrl);
            setUrlCopied(true);
            setTimeout(() => setUrlCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy URL: ', err);
        }
    };

    if (isLoading) {
        return (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div
                    className="loading-spinner"
                    style={{
                        width: '40px',
                        height: '40px',
                        border: '3px solid rgba(255,255,255,0.3)',
                        borderTop: '3px solid #667eea',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 20px',
                    }}
                />
                <p
                    style={{
                        color: 'rgba(255,255,255,0.6)',
                        fontSize: '1.1rem',
                        margin: 0,
                    }}
                >
                    Generating your Lightning Address...
                </p>
                <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
            </div>
        );
    }

    const pageUrl = `${config.domain}/@${username}`;

    // Show unclaimed username UI
    if (usernameUnclaimed) {
        return (
            <div style={{ animation: 'fadeInUp 0.6s ease-out forwards' }}>
                {/* Username Display */}
                <div
                    style={{
                        textAlign: 'center',
                        marginBottom: '30px',
                        padding: '20px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '16px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(10px)',
                    }}
                >
                    <div
                        style={{
                            fontSize: '2.2rem',
                            fontWeight: '700',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            marginBottom: '8px',
                            letterSpacing: '-0.02em',
                        }}
                    >
                        {username}
                    </div>
                    <div
                        style={{
                            fontSize: '1rem',
                            color: 'rgba(255, 255, 255, 0.6)',
                            fontWeight: '500',
                        }}
                    >
                        This username is available!
                    </div>
                </div>

                {/* Claim Username Card */}
                <div
                    style={{
                        textAlign: 'center',
                        padding: '40px',
                        background: 'rgba(255, 255, 255, 0.98)',
                        borderRadius: '24px',
                        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.1)',
                        margin: '25px 0',
                        transition: 'all 0.4s ease',
                    }}
                >
                    {/* Icon */}
                    <div
                        style={{
                            fontSize: '4rem',
                            color: '#667eea',
                            marginBottom: '20px',
                        }}
                    >
                        <i className="fas fa-user-plus"></i>
                    </div>

                    {/* Main Message */}
                    <h2
                        style={{
                            fontSize: '1.8rem',
                            fontWeight: '700',
                            color: '#2d3748',
                            marginBottom: '15px',
                            margin: '0 0 15px 0',
                        }}
                    >
                        Claim @{username}
                    </h2>

                    <p
                        style={{
                            fontSize: '1.1rem',
                            color: '#4a5568',
                            lineHeight: '1.6',
                            marginBottom: '30px',
                            margin: '0 0 30px 0',
                        }}
                    >
                        This Lightning Address is available! Create your account to claim it and start receiving Bitcoin payments.
                    </p>

                    {/* Login Button */}
                    <button
                        type="button"
                        onClick={() => {
                            route('/login');
                        }}
                        style={{
                            padding: '15px 30px',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            fontSize: '1.1rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            justifyContent: 'center',
                            margin: '0 auto 25px',
                            width: 'fit-content',
                        }}
                    >
                        <i className="fas fa-sign-in-alt"></i>
                        Login & Claim Username
                    </button>

                    {/* Divider */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            margin: '25px 0',
                            gap: '15px',
                        }}
                    >
                        <div
                            style={{
                                flex: 1,
                                height: '1px',
                                background: '#e2e8f0',
                            }}
                        ></div>
                        <span
                            style={{
                                color: '#a0aec0',
                                fontSize: '0.9rem',
                                fontWeight: '500',
                            }}
                        >
                            or download our mobile app
                        </span>
                        <div
                            style={{
                                flex: 1,
                                height: '1px',
                                background: '#e2e8f0',
                            }}
                        ></div>
                    </div>

                    {/* Mobile App Buttons */}
                    <div
                        style={{
                            display: 'flex',
                            gap: '15px',
                            justifyContent: 'center',
                            flexWrap: 'wrap',
                        }}
                    >
                        {/* iOS App */}
                        <a
                            href="https://layerzwallet.com"
                            target="_blank"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '12px 20px',
                                background: '#000000',
                                color: 'white',
                                textDecoration: 'none',
                                borderRadius: '10px',
                                fontSize: '0.95rem',
                                fontWeight: '600',
                                transition: 'all 0.3s ease',
                            }}
                            rel="noopener"
                        >
                            <i className="fab fa-apple" style={{ fontSize: '1.2rem' }}></i>
                            Download for iOS
                        </a>

                        {/* Android App */}
                        <a
                            href="https://layerzwallet.com"
                            target="_blank"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '12px 20px',
                                background: '#34a853',
                                color: 'white',
                                textDecoration: 'none',
                                borderRadius: '10px',
                                fontSize: '0.95rem',
                                fontWeight: '600',
                                transition: 'all 0.3s ease',
                            }}
                            rel="noopener"
                        >
                            <i className="fab fa-google-play" style={{ fontSize: '1.2rem' }}></i>
                            Download for Android
                        </a>
                    </div>
                </div>

                {/* Benefits Card */}
                <div
                    style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '16px',
                        padding: '20px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(10px)',
                        marginTop: '25px',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            marginBottom: '15px',
                        }}
                    >
                        <i
                            className="fas fa-bolt"
                            style={{
                                color: '#f6ad55',
                                marginRight: '10px',
                                fontSize: '1.1rem',
                            }}
                        ></i>
                        <span
                            style={{
                                color: 'rgba(255,255,255,0.87)',
                                fontWeight: '600',
                                fontSize: '1rem',
                            }}
                        >
                            Why claim this username?
                        </span>
                    </div>

                    <ul
                        style={{
                            color: 'rgba(255,255,255,0.6)',
                            fontSize: '0.9rem',
                            lineHeight: '1.6',
                            margin: 0,
                            paddingLeft: '20px',
                        }}
                    >
                        <li style={{ marginBottom: '8px' }}>
                            Get your custom Lightning Address: {username}@{config.domain}
                        </li>
                        <li style={{ marginBottom: '8px' }}>Receive Bitcoin payments instantly</li>
                        <li style={{ marginBottom: '8px' }}>Share your personal Lightning page</li>
                        <li>Easy to remember and share with others</li>
                    </ul>
                </div>

                {/* Additional Styles */}
                <style>{`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          a:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
          }
          
          button:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
          }
          
          @media (max-width: 480px) {
            .qr-container {
              padding: 25px !important;
              margin: 20px 0 !important;
            }
            
            a, button {
              width: 100% !important;
              justify-content: center !important;
            }
          }
        `}</style>
            </div>
        );
    }

    return (
        <div style={{ animation: 'fadeInUp 0.6s ease-out forwards' }}>
            {/* Username Display */}
            <div
                style={{
                    textAlign: 'center',
                    marginBottom: '30px',
                    padding: '20px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                }}
            >
                <div
                    style={{
                        fontSize: '2.2rem',
                        fontWeight: '700',
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0.7) 100%)',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        marginBottom: '8px',
                        letterSpacing: '-0.02em',
                        textShadow: '0 2px 10px rgba(255,255,255,0.1)',
                    }}
                >
                    {username}
                </div>
            </div>

            {/* QR Code Container */}
            <div
                className="qr-container"
                style={{
                    textAlign: 'center',
                    padding: '40px',
                    background: 'rgba(255, 255, 255, 0.98)',
                    borderRadius: '24px',
                    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.1)',
                    margin: '25px 0',
                    transition: 'all 0.4s ease',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {/* QR Code */}
                <div
                    style={{
                        display: 'inline-block',
                        padding: '20px',
                        background: '#ffffff',
                        borderRadius: '20px',
                        boxShadow: '0 8px 25px rgba(0, 0, 0, 0.08)',
                        margin: '0 auto 25px',
                        transition: 'transform 0.3s ease',
                    }}
                >
                    <canvas
                        ref={canvasRef}
                        style={{
                            display: 'block',
                            borderRadius: '12px',
                        }}
                    />
                </div>

                {/* Lightning Address Text */}
                <div
                    style={{
                        fontSize: '0.95rem',
                        color: '#2d3748',
                        marginBottom: '25px',
                        fontFamily: 'Monaco, Consolas, monospace',
                        background: '#f7fafc',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        wordBreak: 'break-all',
                    }}
                >
                    {qrCodeData}
                </div>

                {/* Copy Button */}
                <button
                    type="button"
                    onClick={copyToClipboard}
                    style={{
                        padding: '15px 30px',
                        background: copied ? 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '1rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        justifyContent: 'center',
                        margin: '0 auto',
                    }}
                >
                    <i className={copied ? 'fas fa-check' : 'fas fa-copy'}></i>
                    {copied ? 'Copied!' : 'Copy Lightning Address'}
                </button>
            </div>

            {/* Personal Page URL Section */}
            <div
                style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '16px',
                    padding: '20px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    marginBottom: '25px',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '15px',
                    }}
                >
                    <i
                        className="fas fa-link"
                        style={{
                            color: '#667eea',
                            marginRight: '10px',
                            fontSize: '1.1rem',
                        }}
                    ></i>
                    <span
                        style={{
                            color: 'rgba(255,255,255,0.87)',
                            fontWeight: '600',
                            fontSize: '1rem',
                        }}
                    >
                        Your Personal Page
                    </span>
                </div>

                <div
                    style={{
                        fontSize: '0.9rem',
                        color: 'rgba(255,255,255,0.6)',
                        marginBottom: '15px',
                        fontFamily: 'Monaco, Consolas, monospace',
                        background: 'rgba(255, 255, 255, 0.05)',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        wordBreak: 'break-all',
                    }}
                >
                    {pageUrl}
                </div>

                <button
                    type="button"
                    onClick={copyPageUrl}
                    style={{
                        padding: '12px 24px',
                        background: urlCopied ? 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)' : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '0.95rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        justifyContent: 'center',
                        margin: '0 auto',
                    }}
                >
                    <i className={urlCopied ? 'fas fa-check' : 'fas fa-share'}></i>
                    {urlCopied ? 'URL Copied!' : 'Share Page URL'}
                </button>
            </div>

            {/* Info Card */}
            <div
                style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '16px',
                    padding: '20px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    marginTop: '25px',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '12px',
                    }}
                >
                    <i
                        className="fas fa-info-circle"
                        style={{
                            color: '#667eea',
                            marginRight: '10px',
                            fontSize: '1.1rem',
                        }}
                    ></i>
                    <span
                        style={{
                            color: 'rgba(255,255,255,0.87)',
                            fontWeight: '600',
                            fontSize: '1rem',
                        }}
                    >
                        How to use
                    </span>
                </div>
                <p
                    style={{
                        color: 'rgba(255,255,255,0.6)',
                        fontSize: '0.9rem',
                        lineHeight: '1.5',
                        margin: 0,
                    }}
                >
                    Share this QR code or Lightning Address to receive Bitcoin payments instantly via the Lightning Network. You can also share your personal page URL so others can easily access your
                    Lightning Address.
                </p>
            </div>

            {/* Additional Styles */}
            <style>{`
        .qr-container:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.15);
        }
        
        .qr-container button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
        }
        
        .qr-container canvas:hover {
          transform: scale(1.02);
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @media (max-width: 480px) {
          .qr-container {
            padding: 25px !important;
            margin: 20px 0 !important;
          }
          
          .qr-container > div:first-child {
            padding: 15px !important;
          }
          
          .qr-container button {
            width: 100% !important;
            margin: 0 !important;
          }
        }
      `}</style>
        </div>
    );
}
