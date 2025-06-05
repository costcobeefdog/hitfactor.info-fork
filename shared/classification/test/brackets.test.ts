import assert from "assert";
import { describe, it } from "node:test";

import { classForPercent, percentForClass } from "../brackets";

describe("brackets", () => {
  it("correctly maps classes to min percent", () => {
    assert.equal(percentForClass("U"), 0);
    assert.equal(percentForClass("D"), 2);
    assert.equal(percentForClass("C"), 40);
    assert.equal(percentForClass("B"), 60);
    assert.equal(percentForClass("A"), 75);
    assert.equal(percentForClass("M"), 85);
    assert.equal(percentForClass("GM"), 95);
  });

  it("correctly maps percent to class", () => {
    assert.equal(classForPercent(-3), "U");
    assert.equal(classForPercent(0), "U");
    assert.equal(classForPercent(1), "U");
    assert.equal(classForPercent(1.2), "U");
    assert.equal(classForPercent(1.2), "U");

    assert.equal(classForPercent(2), "D");
    assert.equal(classForPercent(2.0), "D");
    assert.equal(classForPercent(2.1), "D");
    assert.equal(classForPercent(32.1), "D");
    assert.equal(classForPercent(39.99999), "D");

    assert.equal(classForPercent(40), "C");
    assert.equal(classForPercent(45), "C");
    assert.equal(classForPercent(59.99999), "C");

    assert.equal(classForPercent(60), "B");
    assert.equal(classForPercent(74.99999), "B");

    assert.equal(classForPercent(75), "A");
    assert.equal(classForPercent(84.99999), "A");

    assert.equal(classForPercent(85), "M");
    assert.equal(classForPercent(94.999999), "M");

    assert.equal(classForPercent(95), "GM");
    assert.equal(classForPercent(95.00001), "GM");
    assert.equal(classForPercent(100), "GM");
    assert.equal(classForPercent(195.00001), "GM");

    assert.strictEqual(classForPercent(0), "U");
    assert.strictEqual(classForPercent(-0), "U");
    assert.strictEqual(classForPercent(-1), "U");

    assert.strictEqual(classForPercent(10), "D");
    assert.strictEqual(classForPercent(10.11), "D");
    assert.strictEqual(classForPercent(39.999999), "D");

    assert.strictEqual(classForPercent(40), "C");
    assert.strictEqual(classForPercent(45), "C");
    assert.strictEqual(classForPercent(55.9999), "C");
    assert.strictEqual(classForPercent(59.9999), "C");

    assert.strictEqual(classForPercent(60.0), "B");
    assert.strictEqual(classForPercent(60.00001), "B");
    assert.strictEqual(classForPercent(60.00001), "B");
    assert.strictEqual(classForPercent(64.00001), "B");
    assert.strictEqual(classForPercent(72.00001), "B");
    assert.strictEqual(classForPercent(74.00001), "B");
    assert.strictEqual(classForPercent(74.99991), "B");

    assert.strictEqual(classForPercent(80.00001), "A");
    assert.strictEqual(classForPercent(80.00001), "A");
    assert.strictEqual(classForPercent(81.00001), "A");
    assert.strictEqual(classForPercent(82.00001), "A");
    assert.strictEqual(classForPercent(83.00001), "A");
    assert.strictEqual(classForPercent(84.00001), "A");
    assert.strictEqual(classForPercent(84.99999), "A");

    assert.strictEqual(classForPercent(85), "M");
    assert.strictEqual(classForPercent(85.00001), "M");
    assert.strictEqual(classForPercent(87.00001), "M");
    assert.strictEqual(classForPercent(94.00001), "M");
    assert.strictEqual(classForPercent(94.99001), "M");
    assert.strictEqual(classForPercent(94.99999), "M");
    assert.strictEqual(classForPercent(94.00001), "M");

    assert.strictEqual(classForPercent(95), "GM");
    assert.strictEqual(classForPercent(95.00001), "GM");
    assert.strictEqual(classForPercent(97.00001), "GM");
    assert.strictEqual(classForPercent(103.00001), "GM");
    assert.strictEqual(classForPercent(101), "GM");
    assert.strictEqual(classForPercent(102), "GM");
  });
});
