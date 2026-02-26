import { describe, expect, test } from 'bun:test'
import { Pattern } from './pattern'
import { isEven, isNegative, isOdd } from './test-predicates'

describe('Matcher', () => {
  test('should match a 3-element sequential pattern', () => {
    const matcher = Pattern.where<number>(isEven).followedBy(isOdd).followedBy(isEven).compile()

    expect(matcher.findAll([2, 3, 4, 6, 7, 8, 9, 10])).toEqual([
      { start: 0, end: 2, data: [2, 3, 4] },
      { start: 3, end: 5, data: [6, 7, 8] },
    ])
  })

  test('should match a single-element pattern', () => {
    const matcher = Pattern.where<number>(isEven).compile()

    expect(matcher.findAll([1, 2, 3, 4, 5, 6])).toEqual([
      { start: 1, end: 1, data: [2] },
      { start: 3, end: 3, data: [4] },
      { start: 5, end: 5, data: [6] },
    ])
  })

  test('should return empty array when no matches', () => {
    const matcher = Pattern.where<number>(isNegative).compile()
    expect(matcher.findAll([1, 2, 3])).toEqual([])
  })

  test('should return empty array for empty sequence', () => {
    const matcher = Pattern.where<number>(n => n > 0).compile()
    expect(matcher.findAll([])).toEqual([])
  })

  test('find() returns the first match', () => {
    const matcher = Pattern.where<number>(isEven).compile()

    expect(matcher.find([1, 2, 3, 4])).toEqual({
      start: 1,
      end: 1,
      data: [2],
    })
  })

  test('find() returns null when no match', () => {
    const matcher = Pattern.where<number>(isNegative).compile()
    expect(matcher.find([1, 2, 3])).toBeNull()
  })

  test('test() returns boolean', () => {
    const matcher = Pattern.where<number>(isEven).compile()

    expect(matcher.test([1, 2, 3])).toBe(true)
    expect(matcher.test([1, 3, 5])).toBe(false)
  })

  describe('iterable support', () => {
    function* generate<T>(items: T[]): Generator<T> {
      yield* items
    }

    test('findAll works with generators', () => {
      const matcher = Pattern.where<number>(isEven).compile()
      const array = [1, 2, 3, 4, 5, 6]
      expect(matcher.findAll(generate(array))).toEqual(matcher.findAll(array))
    })

    test('find works with generators', () => {
      const matcher = Pattern.where<number>(isEven).compile()
      expect(matcher.find(generate([1, 2, 3, 4]))).toEqual({ start: 1, end: 1, data: [2] })
      expect(matcher.find(generate([1, 3, 5]))).toBeNull()
    })

    test('test works with generators', () => {
      const matcher = Pattern.where<number>(isEven).compile()
      expect(matcher.test(generate([1, 2, 3]))).toBe(true)
      expect(matcher.test(generate([1, 3, 5]))).toBe(false)
    })

    test('findAll with Set', () => {
      const matcher = Pattern.where<number>(isEven).compile()
      expect(matcher.findAll(new Set([1, 2, 3]))).toEqual([{ start: 1, end: 1, data: [2] }])
    })

    test('multi-step pattern with generator', () => {
      const matcher = Pattern.where<number>(isEven).followedBy(isOdd).followedBy(isEven).compile()
      const array = [2, 3, 4, 6, 7, 8]
      expect(matcher.findAll(generate(array))).toEqual(matcher.findAll(array))
    })
  })
})
