import { staticPlugin } from '@elysiajs/static';
import { swagger } from '@elysiajs/swagger';
import { Elysia, t } from 'elysia';
import config from './config';
import serverConfig from './config-server';
import { databaseService } from './database-service';
import { createInvoiceForSparkAddress, initializeSparkWallet, isSparkAddress } from './spark-service';

const pckg = require('../package.json');

// Initialize the Spark wallet
initializeSparkWallet().catch(error => {
    console.error('Error initializing wallet:', error);
    process.exit(1);
});

const app = new Elysia(serverConfig.elysia)
    .onAfterHandle(({ set }) => {
        set.headers['Access-Control-Allow-Origin'] = '*';
        set.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
        set.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
    })
    .use(
        swagger({
            documentation: {
                info: {
                    title: pckg.name,
                    version: pckg.version,
                    description: 'SPA for self-custodial Lightning Address',
                },
            },
        })
    )
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
    .get('/ping', () => ({ status: 'ok', message: 'SparkHub is running' }))

    // Serve the frontend
    .get('/', () => Bun.file('public/index.html'))

    // LNURL-pay endpoint (/.well-known/lnurlp/{username})
    .get(
        '/.well-known/lnurlp/:username',
        ({ params: { username } }) => {
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
        async ({ params: { username }, query }) => {
            // Parse required LNURL-pay callback parameters
            const {
                amount, // Amount in millisatoshis
                comment, // Optional comment
            } = query;

            // Validate required parameters
            if (!amount || !username) {
                throw new Error('Missing required parameters');
            }

            let sparkAddress = username;

            if (!isSparkAddress(username)) {
                const sparkFromDatabase = databaseService.getSparkAddressByUsername(username);
                if (!sparkFromDatabase) {
                    return { status: 'ERROR', reason: 'Username not found' };
                }

                sparkAddress = sparkFromDatabase;
            }

            // FIXME: use the username to get the spark address
            const pr = await createInvoiceForSparkAddress(sparkAddress, Math.floor(Number(amount) / 1000), comment ?? 'Invoice');

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
        ({ body }) => {
            const { username, sparkAddress } = body;

            // Validate input
            if (!username || !sparkAddress) {
                throw new Error('Username and spark address are required');
            }

            // Check if username already exists
            if (databaseService.getSparkAddressByUsername(username)) {
                return {
                    status: 'error',
                    message: `Username ${username} already exists`,
                };
            }

            // Check if spark address is already associated with another username
            const existingUsername = databaseService.getUsernameBySparkAddress(sparkAddress);
            if (existingUsername) {
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
                return {
                    status: 'ok',
                    message: 'Username successfully associated with spark address',
                    username,
                    sparkAddress,
                };
            } else {
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
        ({ params: { username } }) => {
            const sparkAddress = databaseService.getSparkAddressByUsername(username);

            if (!sparkAddress) {
                return {
                    status: 'error',
                    message: `Username ${username} not found`,
                };
            }

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
        ({ params: { sparkAddress } }) => {
            const username = databaseService.getUsernameBySparkAddress(sparkAddress);

            if (!username) {
                return {
                    status: 'error',
                    message: `No username found for spark address: ${sparkAddress}`,
                };
            }

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
            detail: {
                tags: ['Users'],
                summary: 'Get username by spark address',
                description: 'Retrieves the username associated with a given spark address',
            },
        }
    )

    // Lightning Address endpoint for direct username access
    .get('/:username', () => Bun.file('public/index.html'))

    .listen(process.env.PORT ?? 3000);

console.log(`🦊 Lightning Address API is running at http://${app.server?.hostname}:${app.server?.port}`);
console.log(`📚 Swagger documentation available at http://${app.server?.hostname}:${app.server?.port}/swagger`);

export type App = typeof app;
export { app };
