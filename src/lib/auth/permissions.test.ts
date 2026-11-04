import assert from "node:assert/strict";
import { test } from "node:test";
import { can } from "./permissions";

test("monitoring BBM: data sensitif hanya untuk peran yang berwenang", () => {
  for (const role of ["owner", "finance", "fleet"] as const) {
    assert.equal(can(role, "read", "fuel"), true, role);
    assert.equal(can(role, "write", "fuel"), true, role);
  }
  assert.equal(can("admin", "read", "fuel"), true);
  assert.equal(can("admin", "write", "fuel"), false);
  assert.equal(can("dispatcher", "read", "fuel"), false);
  assert.equal(can("driver", "read", "fuel"), false);
  assert.equal(can(undefined, "read", "fuel"), false);
});

test("peran lama tidak berubah aksesnya", () => {
  assert.equal(can("dispatcher", "write", "dispatch"), true);
  assert.equal(can("finance", "write", "invoices"), true);
  assert.equal(can("fleet", "read", "invoices"), false);
});
