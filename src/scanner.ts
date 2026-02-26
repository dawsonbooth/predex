import type { NFA, NFAState } from './nfa'
import { epsilonClosure, type MatchResult } from './engine'

export class Scanner<T> {
  private nfa: NFA<T>
  private greedy: boolean

  private position = 0
  private scanStart = 0
  private buffer: T[] = []
  private active: Set<NFAState<T>> = new Set()
  private lastAcceptLength = -1
  private simulationAlive = false

  constructor(nfa: NFA<T>, greedy: boolean) {
    this.nfa = nfa
    this.greedy = greedy
    this.initSimulation(0, Infinity)
  }

  push(element: T): MatchResult<T>[] {
    this.buffer.push(element)

    if (this.simulationAlive) {
      this.step(element, this.position, Infinity)
    }

    this.position++
    return this.drain(Infinity)
  }

  end(): MatchResult<T>[] {
    const totalLength = this.position
    const results: MatchResult<T>[] = []

    // Check if current simulation has a pending match with end anchors
    if (this.simulationAlive && this.active.size > 0) {
      const finalActive = epsilonClosure(this.active, this.position, totalLength)
      if (finalActive.has(this.nfa.accept)) {
        this.lastAcceptLength = this.position - this.scanStart
      }
    }

    // Emit pending match if any
    if (this.lastAcceptLength > 0) {
      results.push(this.emitMatch())
    } else if (this.scanStart < totalLength) {
      this.scanStart++
    }

    // Process remaining buffer with known total length
    while (this.scanStart < totalLength) {
      this.initSimulation(this.scanStart, totalLength)

      const bufferOffset = this.scanStart - (this.position - this.buffer.length)
      for (let i = this.scanStart; i < totalLength; i++) {
        const element = this.buffer[bufferOffset + (i - this.scanStart)]
        this.step(element, i, totalLength)
        if (!this.simulationAlive) break
      }

      // Final end-anchor check
      if (this.simulationAlive && this.active.size > 0) {
        const finalActive = epsilonClosure(this.active, totalLength, totalLength)
        if (finalActive.has(this.nfa.accept)) {
          this.lastAcceptLength = totalLength - this.scanStart
        }
      }

      if (this.lastAcceptLength > 0) {
        results.push(this.emitMatch())
      } else {
        this.scanStart++
      }
    }

    return results
  }

  private initSimulation(startPos: number, seqLength: number): void {
    this.active = epsilonClosure(new Set([this.nfa.start]), startPos, seqLength)
    this.lastAcceptLength = this.active.has(this.nfa.accept) ? 0 : -1
    this.simulationAlive = true
  }

  private step(element: T, absolutePosition: number, seqLength: number): void {
    const next = new Set<NFAState<T>>()

    for (const state of this.active) {
      for (const transition of state.transitions) {
        if (transition.predicate(element)) {
          next.add(transition.target)
        }
      }
    }

    this.active = epsilonClosure(next, absolutePosition + 1, seqLength)

    if (this.active.size === 0) {
      this.simulationAlive = false
      return
    }

    if (this.active.has(this.nfa.accept)) {
      this.lastAcceptLength = absolutePosition - this.scanStart + 1
      if (!this.greedy) {
        this.simulationAlive = false
      }
    }
  }

  private drain(seqLength: number): MatchResult<T>[] {
    const results: MatchResult<T>[] = []

    while (!this.simulationAlive && this.scanStart < this.position) {
      if (this.lastAcceptLength > 0) {
        results.push(this.emitMatch())
      } else {
        this.scanStart++
      }

      if (this.scanStart >= this.position) break

      // Start new simulation and replay remaining buffer
      this.initSimulation(this.scanStart, seqLength)

      const bufferStart = this.position - this.buffer.length
      for (let i = this.scanStart; i < this.position; i++) {
        if (!this.simulationAlive) break
        this.step(this.buffer[i - bufferStart], i, seqLength)
      }
    }

    // Ensure simulation is ready for next push
    if (!this.simulationAlive && this.scanStart === this.position) {
      this.initSimulation(this.scanStart, seqLength)
    }

    // Trim consumed buffer
    const consumed = this.scanStart - (this.position - this.buffer.length)
    if (consumed > 0) {
      this.buffer = this.buffer.slice(consumed)
    }

    return results
  }

  private emitMatch(): MatchResult<T> {
    const bufferStart = this.position - this.buffer.length
    const matchStart = this.scanStart
    const matchLength = this.lastAcceptLength
    const dataStart = matchStart - bufferStart

    const result: MatchResult<T> = {
      start: matchStart,
      end: matchStart + matchLength - 1,
      data: this.buffer.slice(dataStart, dataStart + matchLength),
    }

    this.scanStart = matchStart + matchLength
    this.lastAcceptLength = -1
    this.simulationAlive = false

    return result
  }
}
