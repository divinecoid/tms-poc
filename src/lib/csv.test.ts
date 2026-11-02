import assert from "node:assert/strict";
import { test } from "node:test";
import { csvCell, csvRow } from "./csv";

test("escape koma, kutip, dan baris baru", () => {
  assert.equal(csvCell('PT "A", B'), '"PT ""A"", B"');
  assert.equal(csvCell("a\nb"), '"a\nb"');
});

test("menetralkan formula injection pada teks, tapi tidak pada angka negatif", () => {
  assert.equal(csvCell("=HYPERLINK(\"x\")"), '"\'=HYPERLINK(""x"")"');
  assert.equal(csvCell("+62812"), "'+62812");
  assert.equal(csvCell(-500), "-500");
});

test("baris dan nilai kosong", () => {
  assert.equal(csvRow(["a", null, undefined, 3, true]), "a,,,3,true");
});
