import { route } from 'preact-router';
import { config } from '../../config';

export function IndexPage({ path: _path }: { path?: string }) {
    return (
        <div
            style={{
                minHeight: '100vh',
            }}
        >
            {/* Hero Section */}
            <div
                style={{
                    padding: '60px 0px',
                    textAlign: 'center',
                    color: 'white',
                }}
            >
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <p
                        style={{
                            fontSize: '2rem',
                            fontWeight: '700',
                            opacity: 0.9,
                            margin: '0 auto 20px auto',
                            textAlign: 'left',
                        }}
                    >
                        A self-custodial Lightning Wallet and Address.
                    </p>
                    <p
                        style={{
                            fontSize: '1.5rem',
                            fontWeight: '700',
                            opacity: 0.8,
                            margin: '0 auto 80px auto',
                            textAlign: 'left',
                        }}
                    >
                        In-browser, instant, and secure.
                    </p>

                    {/* CTA Button */}
                    <button
                        type="button"
                        onClick={() => {
                            route('/login');
                        }}
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
                        Get Started Here
                    </button>
                </div>
            </div>

            {/* Features Section */}
            <div
                style={{
                    padding: '80px 0px',
                }}
            >
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                            gap: '40px',
                            marginBottom: '60px',
                        }}
                    >
                        {/* Feature 1 */}
                        <div
                            style={{
                                background: 'rgba(255,255,255,0.1)',
                                borderRadius: '20px',
                                padding: '40px',
                                textAlign: 'center',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                transition: 'transform 0.3s ease',
                            }}
                        >
                            <div
                                style={{
                                    fontSize: '4rem',
                                    marginBottom: '20px',
                                }}
                            >
                                🔐
                            </div>
                            <h3
                                style={{
                                    fontSize: '1.5rem',
                                    fontWeight: '600',
                                    marginBottom: '15px',
                                    color: 'white',
                                }}
                            >
                                Self-Custodial Security
                            </h3>
                            <p
                                style={{
                                    fontSize: '1rem',
                                    lineHeight: '1.6',
                                    color: 'rgba(255,255,255,0.8)',
                                }}
                            >
                                You control your private keys. Your Bitcoin remains in your custody at all times. No third-party can access or freeze your funds.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div
                            style={{
                                background: 'rgba(255,255,255,0.1)',
                                borderRadius: '20px',
                                padding: '40px',
                                textAlign: 'center',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                transition: 'transform 0.3s ease',
                            }}
                        >
                            <div
                                style={{
                                    fontSize: '4rem',
                                    marginBottom: '20px',
                                }}
                            >
                                ⚡
                            </div>
                            <h3
                                style={{
                                    fontSize: '1.5rem',
                                    fontWeight: '600',
                                    marginBottom: '15px',
                                    color: 'white',
                                }}
                            >
                                Lightning Fast Payments
                            </h3>
                            <p
                                style={{
                                    fontSize: '1rem',
                                    lineHeight: '1.6',
                                    color: 'rgba(255,255,255,0.8)',
                                }}
                            >
                                Send and receive Bitcoin payments instantly with ultra-low fees via Lightning Network. Perfect for micropayments and everyday transactions.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div
                            style={{
                                background: 'rgba(255,255,255,0.1)',
                                borderRadius: '20px',
                                padding: '40px',
                                textAlign: 'center',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                transition: 'transform 0.3s ease',
                            }}
                        >
                            <div
                                style={{
                                    fontSize: '4rem',
                                    marginBottom: '20px',
                                }}
                            >
                                📧
                            </div>
                            <h3
                                style={{
                                    fontSize: '1.5rem',
                                    fontWeight: '600',
                                    marginBottom: '15px',
                                    color: 'white',
                                }}
                            >
                                Lightning Address
                            </h3>
                            <p
                                style={{
                                    fontSize: '1rem',
                                    lineHeight: '1.6',
                                    color: 'rgba(255,255,255,0.8)',
                                }}
                            >
                                Get your own username@{config.domain} address. As simple as an email address, but for Bitcoin payments.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* How it works section */}
            <div
                style={{
                    padding: '80px 0px',
                }}
            >
                <div
                    style={{
                        maxWidth: '800px',
                        margin: '0 auto',
                        textAlign: 'center',
                    }}
                >
                    <h2
                        style={{
                            fontSize: '2.5rem',
                            fontWeight: '700',
                            marginBottom: '60px',
                            color: 'white',
                            textShadow: '0 2px 10px rgba(0,0,0,0.3)',
                        }}
                    >
                        How It Works
                    </h2>

                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '40px',
                        }}
                    >
                        {/* Step 1 */}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '30px',
                                padding: '30px',
                                background: 'rgba(255,255,255,0.08)',
                                borderRadius: '20px',
                                backdropFilter: 'blur(10px)',
                            }}
                        >
                            <div
                                style={{
                                    width: '80px',
                                    height: '80px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '2rem',
                                    fontWeight: '700',
                                    color: 'white',
                                    flexShrink: 0,
                                }}
                            >
                                1
                            </div>
                            <div style={{ textAlign: 'left' }}>
                                <h3
                                    style={{
                                        fontSize: '1.3rem',
                                        fontWeight: '600',
                                        marginBottom: '10px',
                                        color: 'white',
                                    }}
                                >
                                    Sign in
                                </h3>
                                <p
                                    style={{
                                        fontSize: '1rem',
                                        color: 'rgba(255,255,255,0.8)',
                                        margin: 0,
                                    }}
                                >
                                    Write down your secret seed words or import your existing wallet. Your seed is never stored on our servers.
                                </p>
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '30px',
                                padding: '30px',
                                background: 'rgba(255,255,255,0.08)',
                                borderRadius: '20px',
                                backdropFilter: 'blur(10px)',
                            }}
                        >
                            <div
                                style={{
                                    width: '80px',
                                    height: '80px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '2rem',
                                    fontWeight: '700',
                                    color: 'white',
                                    flexShrink: 0,
                                }}
                            >
                                2
                            </div>
                            <div style={{ textAlign: 'left' }}>
                                <h3
                                    style={{
                                        fontSize: '1.3rem',
                                        fontWeight: '600',
                                        marginBottom: '10px',
                                        color: 'white',
                                    }}
                                >
                                    Pick a username
                                </h3>
                                <p
                                    style={{
                                        fontSize: '1rem',
                                        color: 'rgba(255,255,255,0.8)',
                                        margin: 0,
                                    }}
                                >
                                    Pick a username for your Lightning Address. It will be yourname@{config.domain}
                                </p>
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '30px',
                                padding: '30px',
                                background: 'rgba(255,255,255,0.08)',
                                borderRadius: '20px',
                                backdropFilter: 'blur(10px)',
                            }}
                        >
                            <div
                                style={{
                                    width: '80px',
                                    height: '80px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '2rem',
                                    fontWeight: '700',
                                    color: 'white',
                                    flexShrink: 0,
                                }}
                            >
                                3
                            </div>
                            <div style={{ textAlign: 'left' }}>
                                <h3
                                    style={{
                                        fontSize: '1.3rem',
                                        fontWeight: '600',
                                        marginBottom: '10px',
                                        color: 'white',
                                    }}
                                >
                                    Start Receiving Bitcoin
                                </h3>
                                <p
                                    style={{
                                        fontSize: '1rem',
                                        color: 'rgba(255,255,255,0.8)',
                                        margin: 0,
                                    }}
                                >
                                    Share your Lightning Address (or your personal page) and start receiving instant Bitcoin payments from anyone, anywhere.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* CTA Section */}
            <div style={{ padding: '80px 20px', textAlign: 'center' }}>
                <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                    <h2
                        style={{
                            fontSize: '2.2rem',
                            fontWeight: '700',
                            marginBottom: '20px',
                            color: 'white',
                            textShadow: '0 2px 10px rgba(0,0,0,0.3)',
                        }}
                    >
                        Ready to join the Lightning Network?
                    </h2>

                    <p
                        style={{
                            fontSize: '1.1rem',
                            marginBottom: '40px',
                            color: 'rgba(255,255,255,0.8)',
                            lineHeight: '1.6',
                        }}
                    >
                        Experience the future of Bitcoin payments with your own Lightning Address. It's self-custodial, open-source, and takes less than 2 minutes to set up.
                    </p>

                    <button
                        type="button"
                        onClick={() => {
                            route('/login');
                        }}
                        style={{
                            padding: '20px 6px',
                            fontSize: '1.3rem',
                            fontWeight: '700',
                            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50px',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            boxShadow: '0 10px 30px rgba(240, 147, 251, 0.4)',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.transform = 'translateY(-3px)';
                            e.currentTarget.style.boxShadow = '0 15px 40px rgba(240, 147, 251, 0.6)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 10px 30px rgba(240, 147, 251, 0.4)';
                        }}
                    >
                        🚀 Claim My Lightning Address
                    </button>

                    <div
                        style={{
                            marginTop: '30px',
                            fontSize: '0.9rem',
                            color: 'rgba(255,255,255,0.6)',
                        }}
                    >
                        Self-custodial • No KYC • Open Source
                    </div>
                </div>
            </div>

            {/* Footer */}
            {/* <div style={{ 
                padding: '40px 20px', 
                textAlign: 'center',
                borderTop: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(0,0,0,0.2)'
            }}>
                <div style={{ 
                    fontSize: '0.9rem', 
                    color: 'rgba(255,255,255,0.6)',
                    maxWidth: '800px',
                    margin: '0 auto'
                }}>
                    <p style={{ margin: '0 0 15px 0' }}>
                        Layerz.me - Your gateway to the Lightning Network. Built with ⚡ for the Bitcoin community.
                    </p>
                    <p style={{ margin: 0 }}>
                        Lightning Network • Self-custodial • Open Source • No KYC
                    </p>
                </div>
            </div> */}

            {/* Global Styles */}
            <style>{`
                @media (max-width: 768px) {
                    h1 {
                        font-size: 2rem !important;
                    }
                    .step-container {
                        flex-direction: column !important;
                        text-align: center !important;
                    }
                    .step-container > div:last-child {
                        text-align: center !important;
                    }
                }
                
                .feature-card:hover {
                    transform: translateY(-5px);
                }
                
                * {
                    box-sizing: border-box;
                }
            `}</style>
        </div>
    );
}
