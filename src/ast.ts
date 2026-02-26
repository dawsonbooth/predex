export type Predicate<T> = (element: T) => boolean

export function isGreedy<T>(node: PatternNode<T>): boolean {
  switch (node.type) {
    case 'predicate':
    case 'anchor':
    case 'any':
      return true
    case 'sequence':
      return node.children.every(isGreedy)
    case 'quantifier':
      return node.greedy && isGreedy(node.child)
    case 'alternation':
      return isGreedy(node.left) && isGreedy(node.right)
  }
}

export type PatternNode<T> =
  | { type: 'predicate'; fn: Predicate<T> }
  | { type: 'sequence'; children: PatternNode<T>[] }
  | {
      type: 'quantifier'
      child: PatternNode<T>
      min: number
      max: number
      greedy: boolean
    }
  | { type: 'alternation'; left: PatternNode<T>; right: PatternNode<T> }
  | { type: 'anchor'; position: 'start' | 'end' }
  | { type: 'any' }
