import type { NFA, NFAState } from './nfa'

export interface MatchResult<T> {
  start: number
  end: number
  data: T[]
}

export function epsilonClosure<T>(
  states: Set<NFAState<T>>,
  position: number,
  seqLength: number,
): Set<NFAState<T>> {
  const result = new Set<NFAState<T>>()
  const stack = [...states]

  while (stack.length > 0) {
    const state = stack.pop()!
    if (result.has(state)) continue

    if (state.anchorCheck && !state.anchorCheck(position, seqLength)) {
      continue
    }

    result.add(state)

    for (const target of state.epsilons) {
      if (!result.has(target)) {
        stack.push(target)
      }
    }
  }

  return result
}

export function simulate<T>(
  nfa: NFA<T>,
  sequence: T[],
  offset: number,
  greedy = true,
): { matched: boolean; length: number } {
  let active = epsilonClosure(new Set([nfa.start]), offset, sequence.length)

  let lastAcceptLength = active.has(nfa.accept) ? 0 : -1

  if (!greedy && lastAcceptLength >= 0) {
    return { matched: true, length: 0 }
  }

  for (let i = offset; i < sequence.length; i++) {
    const element = sequence[i]
    const next = new Set<NFAState<T>>()

    for (const state of active) {
      for (const transition of state.transitions) {
        if (transition.predicate(element)) {
          next.add(transition.target)
        }
      }
    }

    active = epsilonClosure(next, i + 1, sequence.length)

    if (active.size === 0) break

    if (active.has(nfa.accept)) {
      lastAcceptLength = i - offset + 1
      if (!greedy) break
    }
  }

  return {
    matched: lastAcceptLength >= 0,
    length: Math.max(lastAcceptLength, 0),
  }
}

export function findAll<T>(nfa: NFA<T>, sequence: T[], greedy = true): MatchResult<T>[] {
  const results: MatchResult<T>[] = []
  let pos = 0

  while (pos < sequence.length) {
    const result = simulate(nfa, sequence, pos, greedy)
    if (result.matched && result.length > 0) {
      results.push({
        start: pos,
        end: pos + result.length - 1,
        data: sequence.slice(pos, pos + result.length),
      })
      pos += result.length
    } else {
      pos += 1
    }
  }

  return results
}

export function findFirst<T>(nfa: NFA<T>, sequence: T[], greedy = true): MatchResult<T> | null {
  let pos = 0

  while (pos < sequence.length) {
    const result = simulate(nfa, sequence, pos, greedy)
    if (result.matched && result.length > 0) {
      return {
        start: pos,
        end: pos + result.length - 1,
        data: sequence.slice(pos, pos + result.length),
      }
    }
    pos += 1
  }

  return null
}

export function test<T>(nfa: NFA<T>, sequence: T[], greedy = true): boolean {
  return findFirst(nfa, sequence, greedy) !== null
}
