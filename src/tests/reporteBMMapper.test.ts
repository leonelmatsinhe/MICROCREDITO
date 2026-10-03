import assert from "assert";
import {
  normalizeBmSex,
  resolveBmSector,
  riskClassForDays,
  validateBmQuarterRange,
} from "../services/ReporteBMMapperService";

assert.strictEqual(validateBmQuarterRange("2025-10-01", "2025-12-31"), true);
assert.strictEqual(validateBmQuarterRange("2025-10-02", "2025-12-31"), false);
assert.strictEqual(validateBmQuarterRange("2025-10-01", "2026-01-31"), false);
assert.strictEqual(validateBmQuarterRange("2025-13-01", "2025-15-31"), false);

assert.strictEqual(resolveBmSector("Comércio informal"), "Comércio");
assert.strictEqual(resolveBmSector("Agricultor"), "Agricultura");
assert.strictEqual(resolveBmSector("Criação de gado"), "Pecuária");
assert.strictEqual(resolveBmSector("Profissão não classificada"), "Outros");
assert.strictEqual(normalizeBmSex("Feminino"), "Mulher");
assert.strictEqual(normalizeBmSex("M"), "Homem");
assert.strictEqual(normalizeBmSex(null), "Outro");

assert.strictEqual(riskClassForDays(0), null);
assert.strictEqual(riskClassForDays(1), "I");
assert.strictEqual(riskClassForDays(30), "I");
assert.strictEqual(riskClassForDays(31), "II");
assert.strictEqual(riskClassForDays(90), "II");
assert.strictEqual(riskClassForDays(91), "III");
assert.strictEqual(riskClassForDays(365), "III");
assert.strictEqual(riskClassForDays(366), "IV");

console.log("BM mapper fixture tests passed (no database writes)." );
