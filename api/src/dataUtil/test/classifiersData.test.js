import assert from "assert";
import test from "node:test";

import { normalizeClassifierCode } from "../classifiersData";

test("normalizeClassifierCode", () => {
  assert.equal(normalizeClassifierCode("25-05 Hello"), "25-05");
  assert.equal(normalizeClassifierCode("foo 25-05 Hello"), "25-05");
  assert.equal(normalizeClassifierCode("foobar99-11"), "99-11");
  assert.equal(normalizeClassifierCode("99-12"), "99-12");
  assert.equal(normalizeClassifierCode("9-12"), undefined);
});
