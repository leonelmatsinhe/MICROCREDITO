import assert from "assert";
import { riskClassForDays, toReportFileSlug, validateQuarterRange } from "../services/microcreditService";

assert.strictEqual(riskClassForDays(0), null);
assert.strictEqual(riskClassForDays(1), "I");
assert.strictEqual(riskClassForDays(30), "I");
assert.strictEqual(riskClassForDays(31), "II");
assert.strictEqual(riskClassForDays(90), "II");
assert.strictEqual(riskClassForDays(91), "III");
assert.strictEqual(riskClassForDays(365), "III");
assert.strictEqual(riskClassForDays(366), "IV");
assert.strictEqual(toReportFileSlug("Cantinho dos Petiscos"), "cantinho-dos-petiscos");
assert.strictEqual(validateQuarterRange("2025-10-01", "2025-12-31"), true);
assert.strictEqual(validateQuarterRange("2025-10-01", "2025-11-30"), false);
assert.strictEqual(validateQuarterRange("2025-02-30", "2025-04-30"), false);
console.log("Microcredit unit tests passed.");