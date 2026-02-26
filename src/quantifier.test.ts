import { describe, expect, test } from 'bun:test'
import { Pattern } from './pattern'
import { isEven, isOdd, isPositive } from './test-predicates'

describe('Quantifiers', () => {
  describe('oneOrMore (+)', () => {
    test('matches one element', () => {
      const m = Pattern.where<number>(isEven).oneOrMore().compile()
      expect(m.findAll([1, 2, 3])).toEqual([{ start: 1, end: 1, data: [2] }])
    })

    test('matches multiple consecutive elements (greedy)', () => {
      const m = Pattern.where<number>(isEven).oneOrMore().compile()
      expect(m.findAll([2, 4, 6, 3])).toEqual([{ start: 0, end: 2, data: [2, 4, 6] }])
    })

    test('finds multiple separate runs', () => {
      const m = Pattern.where<number>(isEven).oneOrMore().compile()
      expect(m.findAll([2, 4, 1, 6, 8])).toEqual([
        { start: 0, end: 1, data: [2, 4] },
        { start: 3, end: 4, data: [6, 8] },
      ])
    })

    test('no match when zero elements satisfy', () => {
      const m = Pattern.where<number>(isEven).oneOrMore().compile()
      expect(m.findAll([1, 3, 5])).toEqual([])
    })
  })

  describe('zeroOrMore (*)', () => {
    test('matches multiple consecutive elements', () => {
      // Pattern: even* odd — greedy even* then an odd
      const m = Pattern.where<number>(isEven).zeroOrMore().followedBy(isOdd).compile()
      expect(m.findAll([2, 4, 3])).toEqual([{ start: 0, end: 2, data: [2, 4, 3] }])
    })

    test('matches with zero occurrences of quantified element', () => {
      // even* odd — if sequence starts with odd, even* matches zero
      const m = Pattern.where<number>(isEven).zeroOrMore().followedBy(isOdd).compile()
      expect(m.findAll([3, 5])).toEqual([
        { start: 0, end: 0, data: [3] },
        { start: 1, end: 1, data: [5] },
      ])
    })
  })

  describe('optional (?)', () => {
    test('matches with the optional element present', () => {
      // even? odd — optional even then odd
      const m = Pattern.where<number>(isEven).optional().followedBy(isOdd).compile()
      expect(m.findAll([2, 3])).toEqual([{ start: 0, end: 1, data: [2, 3] }])
    })

    test('matches without the optional element', () => {
      const m = Pattern.where<number>(isEven).optional().followedBy(isOdd).compile()
      expect(m.findAll([3, 5])).toEqual([
        { start: 0, end: 0, data: [3] },
        { start: 1, end: 1, data: [5] },
      ])
    })
  })

  describe('times({n})', () => {
    test('matches exactly n elements', () => {
      const m = Pattern.where<number>(isEven).times(3).compile()
      expect(m.findAll([2, 4, 6, 8])).toEqual([{ start: 0, end: 2, data: [2, 4, 6] }])
    })

    test('does not match fewer than n elements', () => {
      const m = Pattern.where<number>(isEven).times(3).compile()
      expect(m.findAll([2, 4, 1])).toEqual([])
    })
  })

  describe('between({n,m})', () => {
    test('matches minimum count', () => {
      // even{2,4} — at least 2, at most 4
      const m = Pattern.where<number>(isEven).between(2, 4).compile()
      expect(m.findAll([2, 4, 1])).toEqual([{ start: 0, end: 1, data: [2, 4] }])
    })

    test('matches up to maximum count (greedy)', () => {
      const m = Pattern.where<number>(isEven).between(2, 4).compile()
      expect(m.findAll([2, 4, 6, 8, 10, 1])).toEqual([{ start: 0, end: 3, data: [2, 4, 6, 8] }])
    })

    test('does not match below minimum', () => {
      const m = Pattern.where<number>(isEven).between(3, 5).compile()
      expect(m.findAll([2, 4, 1])).toEqual([])
    })
  })

  describe('greedy vs lazy', () => {
    test('greedy oneOrMore matches as many as possible', () => {
      // positive+ positive — greedy: consumes as many as possible before yielding
      const m = Pattern.where<number>(isPositive).oneOrMore(true).followedBy(isPositive).compile()
      expect(m.findAll([1, 2, 3])).toEqual([{ start: 0, end: 2, data: [1, 2, 3] }])
    })

    test('lazy oneOrMore matches as few as possible', () => {
      // positive+? positive — lazy: consumes minimum before yielding
      const m = Pattern.where<number>(isPositive).oneOrMore(false).followedBy(isPositive).compile()
      expect(m.findAll([1, 2, 3])).toEqual([{ start: 0, end: 1, data: [1, 2] }])
    })

    test('greedy zeroOrMore consumes as many as possible', () => {
      // even* even — greedy: consume all evens in loop, last one satisfies followedBy
      const m = Pattern.where<number>(isEven).zeroOrMore(true).followedBy(isEven).compile()
      expect(m.findAll([2, 4, 6])).toEqual([{ start: 0, end: 2, data: [2, 4, 6] }])
    })

    test('lazy zeroOrMore consumes as few as possible', () => {
      // even*? even — lazy: skip loop, match each even individually
      const m = Pattern.where<number>(isEven).zeroOrMore(false).followedBy(isEven).compile()
      expect(m.findAll([2, 4, 6])).toEqual([
        { start: 0, end: 0, data: [2] },
        { start: 1, end: 1, data: [4] },
        { start: 2, end: 2, data: [6] },
      ])
    })

    test('greedy optional prefers to include the element', () => {
      // even? even — greedy: include optional even, then match next
      const m = Pattern.where<number>(isEven).optional(true).followedBy(isEven).compile()
      expect(m.findAll([2, 4])).toEqual([{ start: 0, end: 1, data: [2, 4] }])
    })

    test('lazy optional prefers to skip the element', () => {
      // even?? even — lazy: skip optional, match each even alone
      const m = Pattern.where<number>(isEven).optional(false).followedBy(isEven).compile()
      expect(m.findAll([2, 4])).toEqual([
        { start: 0, end: 0, data: [2] },
        { start: 1, end: 1, data: [4] },
      ])
    })

    test('greedy between consumes up to max', () => {
      const m = Pattern.where<number>(isEven).between(1, 3, true).followedBy(isOdd).compile()
      expect(m.findAll([2, 4, 6, 3])).toEqual([{ start: 0, end: 3, data: [2, 4, 6, 3] }])
    })

    test('lazy between consumes only min', () => {
      const m = Pattern.where<number>(isEven).between(1, 3, false).followedBy(isOdd).compile()
      // Lazy: consume 1 even (the minimum), but 4 isn't odd so must backtrack...
      // actually [2] then need odd — 4 is not odd. So try [2,4] then 6 not odd. Then [2,4,6] then 3 is odd.
      // Lazy between still needs to find a valid match, it just prefers fewer.
      expect(m.findAll([2, 4, 6, 3])).toEqual([{ start: 0, end: 3, data: [2, 4, 6, 3] }])
    })

    test('lazy between takes minimum when possible', () => {
      // Use a sequence where the element after min evens is already odd
      const m = Pattern.where<number>(isEven).between(1, 3, false).followedBy(isOdd).compile()
      expect(m.findAll([2, 3, 4])).toEqual([{ start: 0, end: 1, data: [2, 3] }])
    })
  })

  describe('quantifier with sequence', () => {
    test('quantifier on last element of multi-step pattern', () => {
      // odd even+ — an odd followed by one or more evens
      const m = Pattern.where<number>(isOdd).followedBy(isEven).oneOrMore().compile()
      expect(m.findAll([3, 2, 4, 6, 1])).toEqual([{ start: 0, end: 3, data: [3, 2, 4, 6] }])
    })

    test('quantifier followed by more predicates', () => {
      // even+ odd even — one or more evens, then odd, then even
      const m = Pattern.where<number>(isEven)
        .oneOrMore()
        .followedBy(isOdd)
        .followedBy(isEven)
        .compile()
      expect(m.findAll([2, 4, 3, 8])).toEqual([{ start: 0, end: 3, data: [2, 4, 3, 8] }])
    })
  })

  describe('pathological patterns', () => {
    test('does not exhibit exponential behavior', () => {
      // Pattern: positive+ positive+ positive+ — could be pathological with backtracking
      // With NFA simulation this should be O(n * m)
      const m = Pattern.where<number>(isPositive)
        .oneOrMore()
        .followedBy(Pattern.where<number>(isPositive).oneOrMore())
        .followedBy(Pattern.where<number>(isPositive).oneOrMore())
        .followedBy(n => n === 0)
        .compile()

      const seq = Array.from({ length: 100 }, () => 1).concat([0])
      const start = performance.now()
      const results = m.findAll(seq)
      const elapsed = performance.now() - start

      expect(results).toHaveLength(1)
      expect(elapsed).toBeLessThan(1000) // should be <10ms, 1s is generous safety margin
    })
  })
})
