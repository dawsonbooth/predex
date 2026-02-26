import { describe, expect, test } from 'bun:test'
import { Pattern } from './pattern'

describe('Pattern', () => {
  test('where() creates a pattern with one predicate', () => {
    const pattern = Pattern.where<number>(n => n % 2 === 0)
    const ast = pattern.toAST()

    expect(ast.type).toBe('sequence')
    if (ast.type === 'sequence') {
      expect(ast.children).toHaveLength(1)
      expect(ast.children[0].type).toBe('predicate')
    }
  })

  test('followedBy() chains predicates into a sequence', () => {
    const isEven = (n: number) => n % 2 === 0
    const isOdd = (n: number) => n % 2 !== 0

    const pattern = Pattern.where<number>(isEven).followedBy(isOdd).followedBy(isEven)
    const ast = pattern.toAST()

    expect(ast.type).toBe('sequence')
    if (ast.type === 'sequence') {
      expect(ast.children).toHaveLength(3)
      expect(ast.children.every(c => c.type === 'predicate')).toBe(true)
    }
  })

  test('oneOrMore() wraps the last element in a quantifier', () => {
    const pattern = Pattern.where<number>(n => n > 0).oneOrMore()
    const ast = pattern.toAST()

    expect(ast.type).toBe('sequence')
    if (ast.type === 'sequence') {
      expect(ast.children).toHaveLength(1)
      const child = ast.children[0]
      expect(child.type).toBe('quantifier')
      if (child.type === 'quantifier') {
        expect(child.min).toBe(1)
        expect(child.max).toBe(Infinity)
        expect(child.greedy).toBe(true)
      }
    }
  })

  test('or() creates an alternation node', () => {
    const a = Pattern.where<number>(n => n > 0)
    const b = Pattern.where<number>(n => n < 0)
    const pattern = a.or(b)
    const ast = pattern.toAST()

    expect(ast.type).toBe('alternation')
  })

  test('pattern is immutable - followedBy() returns a new instance', () => {
    const p1 = Pattern.where<number>(n => n > 0)
    const p2 = p1.followedBy(n => n < 0)

    expect(p1).not.toBe(p2)

    const ast1 = p1.toAST()
    const ast2 = p2.toAST()
    if (ast1.type === 'sequence' && ast2.type === 'sequence') {
      expect(ast1.children).toHaveLength(1)
      expect(ast2.children).toHaveLength(2)
    }
  })
})
