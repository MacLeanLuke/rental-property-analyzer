/**
 * Smoke test: generate a sample workbook in Node and write it to disk,
 * then reopen it and verify the sheets + cell formulas we care about.
 * Run: npx tsx scripts/smoke-test-xlsx.ts
 */
import { writeFile } from 'node:fs/promises'
import ExcelJS from 'exceljs'
import { buildPropertyWorkbook, buildComparisonWorkbook } from '../src/domain/xlsx'
import { EXAMPLE_INPUTS } from '../src/domain/defaults'
import type { Property } from '../src/domain/types'

function mkProperty(nickname: string, overrides: Partial<typeof EXAMPLE_INPUTS> = {}): Property {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    nickname,
    createdAt: now,
    updatedAt: now,
    inputs: { ...EXAMPLE_INPUTS, ...overrides },
  }
}

async function main() {
  const propA = mkProperty('Sample A')
  const propB = mkProperty('Sample B', { monthlyRent: 2_500, currentValue: 350_000 })

  const singleWb = await buildPropertyWorkbook(propA)
  const singleBuf = await singleWb.xlsx.writeBuffer()
  await writeFile('smoke-single.xlsx', Buffer.from(singleBuf))

  const compWb = await buildComparisonWorkbook([propA, propB])
  const compBuf = await compWb.xlsx.writeBuffer()
  await writeFile('smoke-comparison.xlsx', Buffer.from(compBuf))

  // Reopen single and verify structural sanity
  const reopened = new ExcelJS.Workbook()
  await reopened.xlsx.readFile('smoke-single.xlsx')
  const sheetNames = reopened.worksheets.map((w) => w.name)
  console.log('single sheets:', sheetNames)

  const inputs = reopened.getWorksheet('Inputs')!
  console.log('B4 (purchase price):', inputs.getCell('B4').value)
  console.log('B12 (P&I, expected formula):', inputs.getCell('B12').value)
  console.log('A13 / B13 (loan term):', inputs.getCell('A13').value, '/', inputs.getCell('B13').value)
  console.log('B50 (net proceeds formula):', inputs.getCell('B50').value)

  const hs = reopened.getWorksheet('Hold Scenario')!
  console.log('HS A4 (year 1):', hs.getCell('A4').value)
  console.log('HS B4 (gross rent formula):', hs.getCell('B4').value)
  console.log('HS T4 (mortgage balance formula):', hs.getCell('T4').value)

  const reopenedComp = new ExcelJS.Workbook()
  await reopenedComp.xlsx.readFile('smoke-comparison.xlsx')
  console.log('comparison sheets:', reopenedComp.worksheets.map((w) => w.name))

  console.log('\nWrote smoke-single.xlsx and smoke-comparison.xlsx — open them in Excel/Numbers to verify.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
