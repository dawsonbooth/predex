import type { NFA } from './nfa'
import { findAll, findFirst, test, type MatchResult } from './engine'
import { Scanner } from './scanner'

export { type MatchResult } from './engine'

export class Matcher<T> {
  private nfa: NFA<T>
  private greedy: boolean

  constructor(nfa: NFA<T>, greedy: boolean) {
    this.nfa = nfa
    this.greedy = greedy
  }

  findAll(sequence: Iterable<T>): MatchResult<T>[] {
    if (Array.isArray(sequence)) {
      return findAll(this.nfa, sequence, this.greedy)
    }
    const scanner = this.scanner()
    const results: MatchResult<T>[] = []
    for (const element of sequence) {
      results.push(...scanner.push(element))
    }
    results.push(...scanner.end())
    return results
  }

  find(sequence: Iterable<T>): MatchResult<T> | null {
    if (Array.isArray(sequence)) {
      return findFirst(this.nfa, sequence, this.greedy)
    }
    const scanner = this.scanner()
    for (const element of sequence) {
      const results = scanner.push(element)
      if (results.length > 0) return results[0]
    }
    const results = scanner.end()
    return results.length > 0 ? results[0] : null
  }

  test(sequence: Iterable<T>): boolean {
    if (Array.isArray(sequence)) {
      return test(this.nfa, sequence, this.greedy)
    }
    return this.find(sequence) !== null
  }

  scanner(): Scanner<T> {
    return new Scanner(this.nfa, this.greedy)
  }
}
