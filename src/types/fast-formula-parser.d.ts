// Minimal types for the parts of fast-formula-parser the xlsx tests use.
declare module 'fast-formula-parser' {
  export interface CellRef {
    sheet: string
    row: number
    col: number
  }
  export interface RangeRef {
    sheet: string
    from: { row: number; col: number }
    to: { row: number; col: number }
  }
  export interface FunctionArg {
    value: unknown
    isArray: boolean
    isRangeRef: boolean
    isCellRef: boolean
  }
  export interface ParserConfig {
    onCell?: (ref: CellRef) => unknown
    onRange?: (ref: RangeRef) => unknown[][]
    functions?: Record<string, (...args: FunctionArg[]) => unknown>
  }
  export default class FormulaParser {
    constructor(config?: ParserConfig)
    parse(formula: string, position: CellRef): unknown
  }
}
