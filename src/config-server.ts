export const tlsCertPath = ''; // path to .crt
export const tlsKeyPath = ''; // path to .key

export const config = {
    sqlite_path: './sparkhub.sqlite',
    seed: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
    elysia: {
        // serve: {
        //     tls: {
        //         cert: Bun.file(tlsCertPath),
        //         key: Bun.file(tlsKeyPath),
        //     },
        // },
    },
};

export default config;
