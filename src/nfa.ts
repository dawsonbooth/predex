import type { PatternNode, Predicate } from './ast'

export interface NFAState<T> {
  id: number
  epsilons: NFAState<T>[]
  transitions: Array<{ predicate: Predicate<T>; target: NFAState<T> }>
  anchorCheck?: (index: number, length: number) => boolean
}

export interface NFA<T> {
  start: NFAState<T>
  accept: NFAState<T>
}

export function compile<T>(node: PatternNode<T>): NFA<T> {
  let nextId = 0

  function createState(): NFAState<T> {
    return { id: nextId++, epsilons: [], transitions: [] }
  }

  function compileNode(node: PatternNode<T>): NFA<T> {
    switch (node.type) {
      case 'predicate':
        return compilePredicate(node.fn)
      case 'sequence':
        return compileSequence(node.children)
      case 'quantifier':
        return compileQuantifier(node.child, node.min, node.max, node.greedy)
      case 'alternation':
        return compileAlternation(node.left, node.right)
      case 'anchor':
        return compileAnchor(node.position)
      case 'any':
        return compilePredicate(() => true)
    }
  }

  function compilePredicate(fn: Predicate<T>): NFA<T> {
    const start = createState()
    const accept = createState()
    start.transitions.push({ predicate: fn, target: accept })
    return { start, accept }
  }

  function compileSequence(children: PatternNode<T>[]): NFA<T> {
    if (children.length === 0) {
      const start = createState()
      const accept = createState()
      start.epsilons.push(accept)
      return { start, accept }
    }

    if (children.length === 1) {
      return compileNode(children[0])
    }

    const fragments = children.map(child => compileNode(child))

    for (let i = 0; i < fragments.length - 1; i++) {
      fragments[i].accept.epsilons.push(fragments[i + 1].start)
    }

    return { start: fragments[0].start, accept: fragments[fragments.length - 1].accept }
  }

  function compileQuantifier(
    child: PatternNode<T>,
    min: number,
    max: number,
    greedy: boolean,
  ): NFA<T> {
    const start = createState()
    const accept = createState()

    let lastState = start

    for (let i = 0; i < min; i++) {
      const fragment = compileNode(child)
      lastState.epsilons.push(fragment.start)
      lastState = fragment.accept
    }

    if (max === Infinity) {
      const loopFragment = compileNode(child)
      lastState.epsilons.push(
        ...(greedy ? [loopFragment.start, accept] : [accept, loopFragment.start]),
      )
      loopFragment.accept.epsilons.push(lastState)
    } else {
      for (let i = min; i < max; i++) {
        const fragment = compileNode(child)
        lastState.epsilons.push(...(greedy ? [fragment.start, accept] : [accept, fragment.start]))
        lastState = fragment.accept
      }
      lastState.epsilons.push(accept)
    }

    return { start, accept }
  }

  function compileAlternation(left: PatternNode<T>, right: PatternNode<T>): NFA<T> {
    const start = createState()
    const accept = createState()
    const leftNFA = compileNode(left)
    const rightNFA = compileNode(right)

    start.epsilons.push(leftNFA.start, rightNFA.start)
    leftNFA.accept.epsilons.push(accept)
    rightNFA.accept.epsilons.push(accept)

    return { start, accept }
  }

  function compileAnchor(position: 'start' | 'end'): NFA<T> {
    const start = createState()
    const accept = createState()

    start.anchorCheck =
      position === 'start'
        ? (index: number) => index === 0
        : (index: number, length: number) => index === length

    start.epsilons.push(accept)

    return { start, accept }
  }

  return compileNode(node)
}
