import { describe, expect, it } from 'bun:test'
import { isSparkAddress } from '../src/spark-service'

describe('SparkService', () => {
    describe('isSparkAddress', () => {
        it('returns true for valid bech32m addresses', () => {
            expect(isSparkAddress('bc1pm6lqlel3qxefsx0v39nshtghasvvp6ghn3e5hd5q280j5m9h7csqrkzssu')).toBe(false);        
            expect(isSparkAddress('spark1qw2e3r4t5y6u7i8o9p0')).toBe(false);        
            expect(isSparkAddress('invalid-address')).toBe(false)
            expect(isSparkAddress('')).toBe(false)
            expect(isSparkAddress('123456')).toBe(false)

            expect(isSparkAddress('spark1pgssxlr63wd3gyt99uzn9nwmjdncg6lfw6vamkuqf3u7aafuyzds9ny3u9ftwa')).toBe(true);
        })
    })
})

