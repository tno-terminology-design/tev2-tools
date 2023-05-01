import {expect, test} from '@jest/globals'
import { Test } from '../src/Run'

test('trrt', async () => {
    expect(Test('stringInput')).toBe('Returning stringInput');
})