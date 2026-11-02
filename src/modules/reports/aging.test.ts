import assert from "node:assert/strict";
import { test } from "node:test";
import { bucketIndex } from "./aging";

test("bucket aging sesuai batas hari", () => {
  assert.equal(bucketIndex(-5), 0);
  assert.equal(bucketIndex(0), 0);
  assert.equal(bucketIndex(1), 1);
  assert.equal(bucketIndex(30), 1);
  assert.equal(bucketIndex(31), 2);
  assert.equal(bucketIndex(60), 2);
  assert.equal(bucketIndex(61), 3);
  assert.equal(bucketIndex(90), 3);
  assert.equal(bucketIndex(91), 4);
});
