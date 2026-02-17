import { staticPlugin } from '@elysiajs/static';
import { swagger } from '@elysiajs/swagger';
import { Elysia, type Static, t } from 'elysia';
import config from './config';
import serverConfig from './config-server';
import { databaseService } from './database-service';
import { createInvoiceForSparkAddress, initializeSparkWallet, isSparkAddress } from './spark-service';

const pckg = require('../package.json');

type LogMeta = Record<string, unknown>;
type RequestTrace = { requestId: string; startAt: number };

const log = (level: 'INFO' | 'WARN' | 'ERROR', event: string, meta?: LogMeta): void => {
    const timestamp = new Date().toISOString();
    if (meta) {
        console.log(`[${timestamp}] [${level}] ${event}`, meta);
        return;
    }
    console.log(`[${timestamp}] [${level}] ${event}`);
};

const logError = (event: string, error: unknown, meta?: LogMeta): void => {
    const details = error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { value: String(error) };
    log('ERROR', event, { ...meta, error: details });
};

const requestTraces = new WeakMap<Request, RequestTrace>();

// Response schemas
const pingResponseSchema = t.Object({
    status: t.String(),
    message: t.String(),
});

const lnurlPayResponseSchema = t.Object({
    status: t.String(),
    commentAllowed: t.Number(),
    callback: t.String(),
    maxSendable: t.Number(),
    minSendable: t.Number(),
    metadata: t.String(),
    tag: t.String(),
});

const paymentCallbackResponseSchema = t.Union([
    t.Object({
        status: t.Literal('OK'),
        pr: t.String(),
        routes: t.Array(t.Any()),
        disposable: t.Boolean(),
        successAction: t.Object({
            tag: t.String(),
            message: t.String(),
        }),
    }),
    t.Object({
        status: t.Literal('ERROR'),
        reason: t.String(),
    }),
]);

const createUserResponseSchema = t.Object({
    status: t.String(),
    message: t.String(),
    username: t.Optional(t.String()),
    sparkAddress: t.Optional(t.String()),
    existingUsername: t.Optional(t.String()),
});

const getUserResponseSchema = t.Object({
    status: t.String(),
    username: t.Optional(t.String()),
    sparkAddress: t.Optional(t.String()),
    message: t.Optional(t.String()),
});

// Initialize the Spark wallet
log('INFO', 'wallet.initialization.started');
initializeSparkWallet().catch(error => {
    logError('wallet.initialization.failed', error);
    process.exit(1);
});

const app = new Elysia(serverConfig.elysia)
    .use(
        swagger({
            documentation: {
                info: {
                    title: pckg.name,
                    version: pckg.version,
                    description: 'SPA for self-custodial Lightning Address',
                },
            },
            path: '/swagger',
            excludeStaticFile: true,
        })
    )
    .onRequest(({ request }) => {
        const requestId = crypto.randomUUID();
        const startAt = Date.now();
        const path = new URL(request.url).pathname;
        requestTraces.set(request, { requestId, startAt });
        log('INFO', 'http.request.started', {
            requestId,
            method: request.method,
            path,
            url: request.url,
        });
    })
    .onAfterHandle(({ set }) => {
        set.headers['Access-Control-Allow-Origin'] = '*';
        set.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
        set.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
    })
    .onAfterResponse(({ request, set, store }) => {
        const path = new URL(request.url).pathname;
        const trace = requestTraces.get(request);
        const typedStore = store as Record<string, unknown>;
        const startAt = trace?.startAt ?? (typeof typedStore.startAt === 'number' ? typedStore.startAt : Date.now());
        const elapsedMs = Date.now() - startAt;
        log('INFO', 'http.request.completed', {
            requestId: trace?.requestId ?? typedStore.requestId,
            method: request.method,
            path,
            statusCode: set.status,
            elapsedMs,
        });
        requestTraces.delete(request);
    })
    .onError(({ request, code, error, store }) => {
        const path = new URL(request.url).pathname;
        const trace = requestTraces.get(request);
        const typedStore = store as Record<string, unknown>;
        const startAt = trace?.startAt ?? (typeof typedStore.startAt === 'number' ? typedStore.startAt : Date.now());
        const elapsedMs = Date.now() - startAt;
        logError('http.request.failed', error, {
            requestId: trace?.requestId ?? typedStore.requestId,
            method: request.method,
            path,
            errorCode: code,
            elapsedMs,
        });
        requestTraces.delete(request);
    })
    .use(
        staticPlugin({
            assets: 'dist',
            prefix: '/dist', // Use /dist as prefix
        })
    )
    .use(
        staticPlugin({
            assets: 'public',
            prefix: '/public',
        })
    )

    // Health check endpoint
    .get(
        '/ping',
        (): Static<typeof pingResponseSchema> => {
            log('INFO', 'endpoint.ping.executed');
            return { status: 'ok', message: 'SparkHub is running' };
        },
        {
            response: pingResponseSchema,
            detail: {
                summary: 'Health check',
                description: 'Returns the status of the service',
            },
        }
    )

    // Serve the frontend
    .get('/', () => Bun.file('public/index.html'))

    // LNURL-pay endpoint (/.well-known/lnurlp/{username})
    .get(
        '/.well-known/lnurlp/:username',
        ({ params: { username } }): Static<typeof lnurlPayResponseSchema> => {
            log('INFO', 'endpoint.lnurlpay.metadata.generated', { username });
            return {
                status: 'OK',
                commentAllowed: 140,
                callback: `https://${config.domain}/api/lightning-address/${username}/callback`,
                maxSendable: 1000000000, // 1 BTC in sats
                minSendable: 100,
                metadata: JSON.stringify([['text/plain', `Paying to ${username}@${config.domain}`]]),
                tag: 'payRequest',
            };
        },
        {
            params: t.Object({
                username: t.String(),
            }),
            response: lnurlPayResponseSchema,
            detail: {
                tags: ['LNURL'],
                summary: 'Get LNURL-pay metadata',
                description: 'Returns LNURL-pay metadata for a given username',
            },
        }
    )

    // Payment callback endpoint
    .get(
        '/api/lightning-address/:username/callback',
        async ({ params: { username }, query }): Promise<Static<typeof paymentCallbackResponseSchema>> => {
            log('INFO', 'endpoint.lightning.callback.received', {
                username,
                amount: query.amount,
                hasComment: Boolean(query.comment),
            });
            // Parse required LNURL-pay callback parameters
            const {
                amount, // Amount in millisatoshis
                comment, // Optional comment
            } = query;

            // Validate required parameters
            if (!amount || !username) {
                log('WARN', 'endpoint.lightning.callback.missing_parameters', { username, amount });
                throw new Error('Missing required parameters');
            }

            let sparkAddress = username;

            if (!isSparkAddress(username)) {
                const sparkFromDatabase = databaseService.getSparkAddressByUsername(username);
                if (!sparkFromDatabase) {
                    log('WARN', 'endpoint.lightning.callback.username_not_found', { username });
                    return { status: 'ERROR', reason: 'Username not found' };
                }

                sparkAddress = sparkFromDatabase;
                log('INFO', 'endpoint.lightning.callback.resolved_spark_address', { username, sparkAddress });
            }

            // FIXME: use the username to get the spark address
            const pr = await createInvoiceForSparkAddress(sparkAddress, Math.floor(Number(amount) / 1000), comment ?? 'Invoice');
            log('INFO', 'endpoint.lightning.callback.invoice_created', {
                username,
                sparkAddress,
                amountMsat: amount,
            });

            return {
                status: 'OK',
                pr,
                routes: [],
                disposable: false,
                successAction: {
                    tag: 'message',
                    message: `Payment received! Thank you for your payment to ${username}.`,
                },
            };
        },
        {
            params: t.Object({
                username: t.String(),
            }),
            query: t.Object({
                amount: t.String(),
                nonce: t.Optional(t.String()),
                fromnodes: t.Optional(t.String()),
                comment: t.Optional(t.String({ maxLength: 140 })),
                proofofpayer: t.Optional(t.String()),
            }),
            response: paymentCallbackResponseSchema,
            detail: {
                tags: ['Lightning Address'],
                summary: 'Payment callback',
                description: 'Handles payment callbacks for LNURL-pay requests',
            },
        }
    )

    // API endpoint to associate username with spark address
    .post(
        '/api/users',
        ({ body }): Static<typeof createUserResponseSchema> => {
            const { username, sparkAddress } = body;
            log('INFO', 'endpoint.users.create.received', { username, sparkAddress });

            // Validate input
            if (!username || !sparkAddress) {
                log('WARN', 'endpoint.users.create.validation_failed', { username, sparkAddress });
                throw new Error('Username and spark address are required');
            }

            // Check if username already exists
            if (databaseService.getSparkAddressByUsername(username)) {
                log('WARN', 'endpoint.users.create.username_exists', { username });
                return {
                    status: 'error',
                    message: `Username ${username} already exists`,
                };
            }

            // Check if spark address is already associated with another username
            const existingUsername = databaseService.getUsernameBySparkAddress(sparkAddress);
            if (existingUsername) {
                log('WARN', 'endpoint.users.create.spark_address_exists', { sparkAddress, existingUsername });
                return {
                    status: 'error',
                    message: 'Spark address is already associated with another username',
                    sparkAddress,
                    existingUsername,
                };
            }

            // Associate username with spark address
            const success = databaseService.upsertUser(username, sparkAddress);

            if (success) {
                log('INFO', 'endpoint.users.create.success', { username, sparkAddress });
                return {
                    status: 'ok',
                    message: 'Username successfully associated with spark address',
                    username,
                    sparkAddress,
                };
            } else {
                log('ERROR', 'endpoint.users.create.failed', { username, sparkAddress });
                return {
                    status: 'error',
                    message: 'Failed to associate username with spark address',
                    username,
                    sparkAddress,
                };
            }
        },
        {
            body: t.Object({
                username: t.String({ minLength: 1, maxLength: 50 }),
                sparkAddress: t.String({ minLength: 1 }),
            }),
            response: createUserResponseSchema,
            detail: {
                tags: ['Users'],
                summary: 'Associate username with spark address',
                description: 'Creates a new association between a username and spark address',
            },
        }
    )

    // API endpoint to get spark address by username
    .get(
        '/api/users/:username',
        ({ params: { username } }): Static<typeof getUserResponseSchema> => {
            log('INFO', 'endpoint.users.get_by_username.received', { username });
            const sparkAddress = databaseService.getSparkAddressByUsername(username);

            if (!sparkAddress) {
                log('WARN', 'endpoint.users.get_by_username.not_found', { username });
                return {
                    status: 'error',
                    message: `Username ${username} not found`,
                };
            }

            log('INFO', 'endpoint.users.get_by_username.success', { username, sparkAddress });
            return {
                status: 'ok',
                username,
                sparkAddress,
            };
        },
        {
            params: t.Object({
                username: t.String({ minLength: 1, maxLength: 50 }),
            }),
            response: getUserResponseSchema,
            detail: {
                tags: ['Users'],
                summary: 'Get spark address by username',
                description: 'Retrieves the spark address associated with a given username',
            },
        }
    )

    // API endpoint to get username by spark address
    .get(
        '/api/users/by-spark-address/:sparkAddress',
        ({ params: { sparkAddress } }): Static<typeof getUserResponseSchema> => {
            log('INFO', 'endpoint.users.get_by_spark_address.received', { sparkAddress });
            const username = databaseService.getUsernameBySparkAddress(sparkAddress);

            if (!username) {
                log('WARN', 'endpoint.users.get_by_spark_address.not_found', { sparkAddress });
                return {
                    status: 'error',
                    message: `No username found for spark address: ${sparkAddress}`,
                };
            }

            log('INFO', 'endpoint.users.get_by_spark_address.success', { username, sparkAddress });
            return {
                status: 'ok',
                username,
                sparkAddress,
            };
        },
        {
            params: t.Object({
                sparkAddress: t.String({ minLength: 1 }),
            }),
            response: getUserResponseSchema,
            detail: {
                tags: ['Users'],
                summary: 'Get username by spark address',
                description: 'Retrieves the username associated with a given spark address',
            },
        }
    )

    // Catch-all for SPA - must be last
    .get('/:username', () => {
        log('INFO', 'endpoint.spa.username_route.served');
        return Bun.file('public/index.html');
    })

    .listen(process.env.PORT ?? 3000);

log('INFO', 'server.started', {
    host: app.server?.hostname,
    port: app.server?.port,
    version: pckg.version,
    environment: process.env.NODE_ENV ?? 'development',
});
log('INFO', 'server.swagger.available', {
    url: `http://${app.server?.hostname}:${app.server?.port}/swagger`,
});

export type App = typeof app;
export { app };
