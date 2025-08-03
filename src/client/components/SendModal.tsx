import type { PayLightningInvoiceParams, SparkWallet } from '@buildonspark/spark-sdk';
import { decode } from 'bolt11';
import { useEffect, useState } from 'preact/hooks';

interface SendModalProps {
    wallet: SparkWallet;
    onClose: () => void;
}

interface DecodedInvoice {
    satoshis: number | null;
    description: string;
    paymentHash: string;
    expiry: Date;
    timeExpireDate: Date;
}

interface LnurlpData {
    status: string;
    callback: string;
    maxSendable: number;
    minSendable: number;
    metadata: string;
    tag: string;
    description?: string;
}

export function SendModal({ wallet, onClose }: SendModalProps) {
    const [inputValue, setInputValue] = useState('');
    const [decodedInvoice, setDecodedInvoice] = useState<DecodedInvoice | null>(null);
    const [customAmount, setCustomAmount] = useState('');
    const [isLightningAddress, setIsLightningAddress] = useState(false);
    const [lnurlpData, setLnurlpData] = useState<LnurlpData | null>(null);
    const [lightningAmount, setLightningAmount] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Reset state when input changes
    useEffect(() => {
        setDecodedInvoice(null);
        setError('');
        setIsLightningAddress(false);
        setCustomAmount('');
        setLnurlpData(null);
        setLightningAmount('');

        if (!inputValue.trim()) return;

        // Check if it's a lightning address (contains @)
        if (inputValue.includes('@')) {
            setIsLightningAddress(true);
            // TODO: Implement lightning address handling
            console.log('Lightning address detected:', inputValue);
            return;
        }

        // Try to decode as lightning invoice
        try {
            const decoded = decode(inputValue);

            setDecodedInvoice({
                satoshis: decoded.satoshis || null,
                description: String(decoded.tags?.find(tag => tag.tagName === 'description')?.data) || '',
                paymentHash: String(decoded.tags?.find(tag => tag.tagName === 'payment_hash')?.data) || '',
                expiry: new Date((decoded.timeExpireDate || 0) * 1000),
                timeExpireDate: new Date(decoded.timeExpireDate || 0 * 1000),
            });
        } catch (_) {
            setError('Invalid lightning invoice format');
        }
    }, [inputValue]);

    const handleSend = async () => {
        setIsLoading(true);
        setError('');

        try {
            if (isLightningAddress) {
                if (!lnurlpData) {
                    // First step: fetch lnurlpData
                    console.log('Fetching lightning address data for:', inputValue);

                    // Parse host out of inputValue (format: user@host)
                    const [user, host] = inputValue.split('@');
                    if (!user || !host) {
                        setError('Invalid lightning address format');
                        return;
                    }

                    // Build the well-known URL for lightning address
                    const url = `https://${host}/.well-known/lnurlp/${user}`;

                    // Helper for fetch with timeout
                    const fetchWithTimeout = (resource: string, options: any = {}): Promise<Response> => {
                        const { timeout = 9000 } = options;
                        return Promise.race([fetch(resource, options), new Promise<Response>((_, reject) => setTimeout(() => reject(new Error('Request timed out')), timeout))]);
                    };

                    let fetchedLnurlpData: any;
                    try {
                        const resp = await fetchWithTimeout(url, { timeout: 9000 });
                        if (!resp.ok) {
                            throw new Error(`Failed to fetch lightning address details: ${resp.statusText}`);
                        }
                        fetchedLnurlpData = await resp.json();
                    } catch (err) {
                        setError('Failed to fetch lightning address details: ' + (err instanceof Error ? err.message : 'Unknown error'));
                        return;
                    }

                    // Check if the response has status OK
                    if (fetchedLnurlpData.tag !== 'payRequest') {
                        setError(`Lightning address error: ${fetchedLnurlpData.reason || 'Unknown error'}`);
                        return;
                    }

                    // Save lnurlpData to state for later use
                    setLnurlpData(fetchedLnurlpData);

                    // Don't proceed with payment yet - user needs to enter amount
                    return;
                } else {
                    // Second step: make payment with lnurlpData and amount
                    const amountMs = parseInt(lightningAmount) * 1000; // Convert sats to millisats

                    // Validate amount
                    if (amountMs < lnurlpData.minSendable || amountMs > lnurlpData.maxSendable) {
                        setError(`Amount must be between ${Math.ceil(lnurlpData.minSendable / 1000)} and ${Math.floor(lnurlpData.maxSendable / 1000)} sats`);
                        return;
                    }

                    // Make callback request to get invoice
                    const callbackUrl = new URL(lnurlpData.callback);
                    callbackUrl.searchParams.set('amount', amountMs.toString());

                    try {
                        const callbackResp = await fetch(callbackUrl.toString());
                        if (!callbackResp.ok) {
                            throw new Error(`Callback request failed: ${callbackResp.statusText}`);
                        }
                        const callbackData = await callbackResp.json();

                        if (!callbackData.pr) {
                            setError(`Payment request failed: ${callbackData.reason || 'Unknown error'}`);
                            return;
                        }

                        // Pay the invoice
                        const payArgs: PayLightningInvoiceParams = {
                            invoice: callbackData.pr,
                            maxFeeSats: Math.floor((parseInt(lightningAmount) / 100) * 5) + 1,
                        };

                        await wallet.payLightningInvoice(payArgs);
                        onClose();
                    } catch (err) {
                        setError('Failed to complete lightning address payment: ' + (err instanceof Error ? err.message : 'Unknown error'));
                        return;
                    }
                }
            } else if (decodedInvoice) {
                // TODO: Implement invoice payment
                const amountToSend = decodedInvoice.satoshis || parseInt(customAmount);
                console.log('Sending payment for invoice:', {
                    amount: amountToSend,
                    paymentHash: decodedInvoice.paymentHash,
                });
                if (!amountToSend) {
                    setError('Invalid amount');
                    return;
                }

                const payArgs: PayLightningInvoiceParams = {
                    invoice: inputValue,
                    maxFeeSats: Math.floor((amountToSend / 100) * 5) + 1,
                };

                if (customAmount) {
                    payArgs.amountSatsToSend = parseInt(customAmount);
                }

                await wallet.payLightningInvoice(payArgs);
                onClose();
            }
        } catch (err) {
            setError('Failed to send payment:' + (err instanceof Error ? err.message : 'Unknown error'));
        } finally {
            setIsLoading(false);
        }
    };

    const canSend = () => {
        if (isLightningAddress) {
            if (!lnurlpData) {
                // Can fetch details if we have a valid lightning address
                return inputValue.trim().length > 0;
            } else {
                // Can send if we have lnurlpData and a valid amount
                return lightningAmount && parseInt(lightningAmount) > 0;
            }
        }
        if (decodedInvoice) {
            return decodedInvoice.satoshis || (customAmount && parseInt(customAmount) > 0);
        }
        return false;
    };

    const formatSats = (sats: number): string => {
        return sats.toLocaleString();
    };

    const parseMetadata = (metadata: string) => {
        try {
            const parsed = JSON.parse(metadata);
            if (Array.isArray(parsed)) {
                return parsed.reduce((acc: any, item: any) => {
                    if (Array.isArray(item) && item.length >= 2) {
                        const [type, value] = item;
                        if (type === 'text/plain') {
                            acc.description = value;
                        } else if (type === 'text/long-desc') {
                            acc.longDescription = value;
                        } else if (type.startsWith('image/')) {
                            acc.image = { type, data: value };
                        }
                    }
                    return acc;
                }, {});
            }
        } catch (err) {
            console.warn('Failed to parse metadata:', err);
        }
        return {};
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
        modal: {
            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
            padding: '40px',
            borderRadius: '24px',
            boxShadow: '0 25px 80px rgba(0, 0, 0, 0.4)',
            maxWidth: '500px',
            width: '90%',
            textAlign: 'center' as const,
            border: '1px solid rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(20px)',
        },
        title: {
            fontSize: '28px',
            fontWeight: '700',
            color: 'white',
            marginBottom: '8px',
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
        },
        subtitle: {
            fontSize: '16px',
            color: 'rgba(255, 255, 255, 0.9)',
            marginBottom: '32px',
            lineHeight: '1.5',
        },
        inputContainer: {
            marginBottom: '24px',
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
            marginBottom: '16px',
            backdropFilter: 'blur(10px)',
        },
        amountDisplay: {
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            backdropFilter: 'blur(10px)',
        },
        amountNumber: {
            fontSize: '48px',
            fontWeight: '800',
            color: '#7c3aed',
            marginBottom: '8px',
            lineHeight: '1.1',
            fontFamily: 'system-ui, -apple-system, sans-serif',
        },
        amountUnit: {
            fontSize: '18px',
            color: '#6b7280',
            fontWeight: '600',
            textTransform: 'uppercase' as const,
            letterSpacing: '1px',
        },
        description: {
            fontSize: '14px',
            color: '#6b7280',
            marginTop: '12px',
            fontStyle: 'italic',
        },
        invoiceInfo: {
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'left' as const,
            border: '1px solid rgba(255, 255, 255, 0.2)',
        },
        infoRow: {
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '8px',
            fontSize: '14px',
        },
        infoLabel: {
            color: 'rgba(255, 255, 255, 0.7)',
            fontWeight: '500',
        },
        infoValue: {
            color: 'white',
            fontWeight: '600',
        },
        lightningAddressInfo: {
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
        },
        lightningAddressIcon: {
            fontSize: '32px',
            marginBottom: '12px',
        },
        lightningAddressText: {
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '16px',
            fontWeight: '500',
        },
        buttonContainer: {
            display: 'flex',
            gap: '12px',
            marginTop: '24px',
        },
        sendButton: {
            flex: '1',
            padding: '16px 24px',
            fontSize: '16px',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
            textTransform: 'uppercase' as const,
            letterSpacing: '1px',
        },
        cancelButton: {
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
            textTransform: 'uppercase' as const,
            letterSpacing: '1px',
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
        metadataContainer: {
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
        },
        metadataTitle: {
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '14px',
            fontWeight: '600',
            marginBottom: '12px',
            textTransform: 'uppercase' as const,
            letterSpacing: '1px',
        },
        metadataDescription: {
            color: 'white',
            fontSize: '16px',
            fontWeight: '500',
            marginBottom: '8px',
            lineHeight: '1.4',
        },
        metadataLongDesc: {
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '14px',
            lineHeight: '1.5',
            marginBottom: '12px',
        },
        metadataImage: {
            maxWidth: '100%',
            height: 'auto',
            borderRadius: '8px',
            marginTop: '12px',
        },
    };

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
                <div style={styles.title}>⚡ Send Lightning</div>
                <div style={styles.subtitle}>Enter a Lightning invoice or Lightning address</div>

                {error && <div style={styles.error}>{error}</div>}

                <div style={styles.inputContainer}>
                    <input
                        type="text"
                        value={inputValue}
                        onInput={e => setInputValue((e.target as HTMLInputElement).value)}
                        placeholder="Lightning invoice or address@domain.com"
                        style={styles.input}
                        autoFocus
                    />
                </div>

                {decodedInvoice && (
                    <>
                        <div style={styles.amountDisplay}>
                            {decodedInvoice.satoshis ? (
                                <>
                                    <div style={styles.amountNumber}>{formatSats(decodedInvoice.satoshis)}</div>
                                    <div style={styles.amountUnit}>Satoshis</div>
                                </>
                            ) : (
                                <>
                                    <div style={{ fontSize: '20px', color: '#7c3aed', marginBottom: '16px', fontWeight: '600' }}>Input amount in sats:</div>
                                    <input
                                        type="number"
                                        value={customAmount}
                                        onInput={e => setCustomAmount((e.target as HTMLInputElement).value)}
                                        placeholder="Enter amount in sats"
                                        style={{
                                            ...styles.input,
                                            marginBottom: '0',
                                            textAlign: 'center' as const,
                                            fontSize: '18px',
                                            fontWeight: '600',
                                        }}
                                    />
                                </>
                            )}

                            {decodedInvoice.description && <div style={styles.description}>"{decodedInvoice.description}"</div>}
                        </div>

                        <div style={styles.invoiceInfo}>
                            <div style={styles.infoRow}>
                                <span style={styles.infoLabel}>Payment Hash:</span>
                                <span style={styles.infoValue}>{decodedInvoice.paymentHash.substring(0, 12)}...</span>
                            </div>
                            <div style={styles.infoRow}>
                                <span style={styles.infoLabel}>Expires:</span>
                                <span style={styles.infoValue}>{decodedInvoice.timeExpireDate.toLocaleString()}</span>
                            </div>
                        </div>
                    </>
                )}

                {lnurlpData && (
                    <>
                        <div style={styles.lightningAddressInfo}>
                            <div style={styles.lightningAddressIcon}>⚡</div>
                            <div style={styles.lightningAddressText}>Paying to Lightning Address</div>
                        </div>

                        {/* Render metadata */}
                        {(() => {
                            const metadata = parseMetadata(lnurlpData.metadata);
                            const hasMetadata = metadata.description || metadata.longDescription || metadata.image;

                            if (!hasMetadata) return null;

                            return (
                                <div style={styles.metadataContainer}>
                                    <div style={styles.metadataTitle}>Service Information</div>

                                    {metadata.description && <div style={styles.metadataDescription}>{metadata.description}</div>}

                                    {metadata.longDescription && <div style={styles.metadataLongDesc}>{metadata.longDescription}</div>}

                                    {metadata.image && (
                                        <img
                                            src={`data:${metadata.image.type},${metadata.image.data}`}
                                            alt="Service"
                                            style={styles.metadataImage}
                                            onError={e => {
                                                // Hide image if it fails to load
                                                (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                    )}
                                </div>
                            );
                        })()}

                        <div style={styles.amountDisplay}>
                            <div style={{ fontSize: '20px', color: '#7c3aed', marginBottom: '16px', fontWeight: '600' }}>Enter amount to send:</div>
                            <input
                                type="number"
                                value={lightningAmount}
                                onInput={e => setLightningAmount((e.target as HTMLInputElement).value)}
                                placeholder="Enter amount in sats"
                                min={Math.ceil(lnurlpData.minSendable / 1000)}
                                max={Math.floor(lnurlpData.maxSendable / 1000)}
                                style={{
                                    ...styles.input,
                                    marginBottom: '0',
                                    textAlign: 'center' as const,
                                    fontSize: '18px',
                                    fontWeight: '600',
                                }}
                            />
                            <div style={styles.description}>
                                Min: {Math.floor(lnurlpData.minSendable / 1000)} sats | Max: {Math.floor(lnurlpData.maxSendable / 1000)} sats
                            </div>
                        </div>
                    </>
                )}

                <div style={styles.buttonContainer}>
                    <button
                        onClick={handleSend}
                        disabled={!canSend() || isLoading}
                        style={{
                            ...styles.sendButton,
                            opacity: !canSend() || isLoading ? 0.6 : 1,
                            cursor: !canSend() || isLoading ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {isLoading ? '⚡ Processing...' : isLightningAddress && !lnurlpData ? '⚡ Fetch Details' : '⚡ Send Payment'}
                    </button>
                    <button onClick={onClose} style={styles.cancelButton} disabled={isLoading}>
                        Cancel
                    </button>
                </div>
            </div>

            <style>
                {`
                    .send-modal input:focus {
                        border-color: rgba(255, 255, 255, 0.6) !important;
                        box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.3) !important;
                    }
                    
                    .send-modal button:hover:not(:disabled) {
                        transform: translateY(-2px);
                    }
                    
                    .send-modal .send-button:hover:not(:disabled) {
                        background: linear-gradient(135deg, #059669 0%, #047857 100%) !important;
                        box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4) !important;
                    }
                    
                    .send-modal .cancel-button:hover:not(:disabled) {
                        background: rgba(255, 255, 255, 0.25) !important;
                        border-color: rgba(255, 255, 255, 0.6) !important;
                    }
                `}
            </style>
        </div>
    );
}
