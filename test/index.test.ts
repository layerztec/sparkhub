import { describe, expect, it, spyOn, beforeEach, afterEach } from 'bun:test'
import { app } from '../src/index'

describe('Elysia', () => {
    it('returns a response from /ping route', async () => {
        const response = await app
            .handle(new Request('http://localhost:3000/ping'))
            .then((res: Response) => res.json())

        expect(response).toEqual({
            status: 'ok',
            message: 'SparkHub is running'
        })
    })

    describe('/api/users/:username', () => {
        let mockGetSparkAddressByUsername: any

        beforeEach(async () => {
            // Import and mock the database service
            const { databaseService } = await import('../src/database-service')
            mockGetSparkAddressByUsername = spyOn(databaseService, 'getSparkAddressByUsername')
        })

        afterEach(() => {
            mockGetSparkAddressByUsername?.mockRestore()
        })

        it('returns user data when username exists', async () => {
            // Mock to return a dummy spark address
            mockGetSparkAddressByUsername.mockReturnValue('spark1qw2e3r4t5y6u7i8o9p0')

            const response = await app
                .handle(new Request('http://localhost:3000/api/users/testuser'))
                .then((res: Response) => res.json())

            expect(response).toEqual({
                status: 'ok',
                username: 'testuser',
                sparkAddress: 'spark1qw2e3r4t5y6u7i8o9p0'
            })

            expect(mockGetSparkAddressByUsername).toHaveBeenCalledWith('testuser')
        })

        it('returns error when username does not exist', async () => {
            // Mock to return null (user not found)
            mockGetSparkAddressByUsername.mockReturnValue(null)

            const response = await app
                .handle(new Request('http://localhost:3000/api/users/nonexistentuser'))
                .then((res: Response) => res.json())

            expect(response).toEqual({
                status: 'error',
                message: 'Username nonexistentuser not found'
            })

            expect(mockGetSparkAddressByUsername).toHaveBeenCalledWith('nonexistentuser')
        })
    })
})