import { type PatternNode, type Predicate, isGreedy } from './ast'
import { Matcher } from './matcher'
import { compile } from './nfa'

export class Pattern<T> {
  private ast: PatternNode<T>

  private constructor(ast: PatternNode<T>) {
    this.ast = ast
  }

  static where<T>(fn: Predicate<T>): Pattern<T> {
    return new Pattern<T>({
      type: 'sequence',
      children: [{ type: 'predicate', fn }],
    })
  }

  static any<T>(): Pattern<T> {
    return new Pattern<T>({
      type: 'sequence',
      children: [{ type: 'any' }],
    })
  }

  static oneOf<T>(...alternatives: (Predicate<T> | Pattern<T>)[]): Pattern<T> {
    if (alternatives.length === 0) {
      throw new Error('Pattern.oneOf() requires at least one alternative')
    }

    const toNode = (alt: Predicate<T> | Pattern<T>): PatternNode<T> =>
      alt instanceof Pattern ? alt.ast : { type: 'predicate', fn: alt }

    let node = toNode(alternatives[0])
    for (let i = 1; i < alternatives.length; i++) {
      node = { type: 'alternation', left: node, right: toNode(alternatives[i]) }
    }

    return new Pattern<T>(node)
  }

  followedBy(fnOrPattern: Predicate<T> | Pattern<T>): Pattern<T> {
    const seq = this.getSequence()
    const node = this.resolveNode(fnOrPattern)
    return new Pattern<T>({
      type: 'sequence',
      children: [...seq, node],
    })
  }

  followedByAny(): Pattern<T> {
    const seq = this.getSequence()
    return new Pattern<T>({
      type: 'sequence',
      children: [...seq, { type: 'any' }],
    })
  }

  oneOrMore(greedy = true): Pattern<T> {
    return this.applyQuantifier(1, Infinity, greedy)
  }

  zeroOrMore(greedy = true): Pattern<T> {
    return this.applyQuantifier(0, Infinity, greedy)
  }

  optional(greedy = true): Pattern<T> {
    return this.applyQuantifier(0, 1, greedy)
  }

  times(n: number): Pattern<T> {
    return this.applyQuantifier(n, n, true)
  }

  between(min: number, max: number, greedy = true): Pattern<T> {
    return this.applyQuantifier(min, max, greedy)
  }

  or(fnOrPattern: Predicate<T> | Pattern<T>): Pattern<T> {
    return new Pattern<T>({
      type: 'alternation',
      left: this.ast,
      right: this.resolveNode(fnOrPattern),
    })
  }

  atStart(): Pattern<T> {
    const seq = this.getSequence()
    return new Pattern<T>({
      type: 'sequence',
      children: [{ type: 'anchor', position: 'start' }, ...seq],
    })
  }

  atEnd(): Pattern<T> {
    const seq = this.getSequence()
    return new Pattern<T>({
      type: 'sequence',
      children: [...seq, { type: 'anchor', position: 'end' }],
    })
  }

  compile(): Matcher<T> {
    return new Matcher<T>(compile(this.ast), isGreedy(this.ast))
  }

  toAST(): PatternNode<T> {
    return this.ast
  }

  private resolveNode(fnOrPattern: Predicate<T> | Pattern<T>): PatternNode<T> {
    return fnOrPattern instanceof Pattern ? fnOrPattern.ast : { type: 'predicate', fn: fnOrPattern }
  }

  private getSequence(): PatternNode<T>[] {
    if (this.ast.type === 'sequence') {
      return [...this.ast.children]
    }
    return [this.ast]
  }

  private applyQuantifier(min: number, max: number, greedy: boolean): Pattern<T> {
    const seq = this.getSequence()
    if (seq.length === 0) {
      return this
    }

    const rest = seq.slice(0, -1)
    const quantified: PatternNode<T> = {
      type: 'quantifier',
      child: seq[seq.length - 1],
      min,
      max,
      greedy,
    }

    return new Pattern<T>({
      type: 'sequence',
      children: [...rest, quantified],
    })
  }
}
