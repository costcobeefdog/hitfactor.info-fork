import assert from "assert";
import { describe, it } from "node:test";

import { makeClassifier } from "./utils";

import {
  addToCurWindow,
  getDivisionState,
  initialClassificationStateForDivision,
  numberOfDuplicates,
} from "../state";

describe("classification state", () => {
  it("should default to initial", () => {
    assert.deepEqual(getDivisionState({}, "co"), initialClassificationStateForDivision());

    const initial = getDivisionState({}, "co");
    assert.equal(initial.class, "U");
    assert.equal(initial.highClass, "U");
    assert.equal(initial.percent, 0);
    assert.equal(initial.highPercent, 0);
    assert.deepEqual(initial.window, []);
    assert.equal(initial.age, 0);
    assert.equal(initial.age1, 0);
    assert.deepEqual(initial.percentWithDates, []);
  });

  it("should retain previous state", () => {
    const initial = { co: initialClassificationStateForDivision() };
    initial.co.percent = 95;
    initial.co.class = "GM";

    const retrieved = getDivisionState(initial, "co");
    assert.equal(retrieved.percent, 95);
    assert.equal(retrieved.class, "GM");
  });

  it("should calculate number of duplicates correctly", () => {
    assert.strictEqual(numberOfDuplicates([makeClassifier()]), 0);
    assert.strictEqual(numberOfDuplicates([makeClassifier(), makeClassifier()]), 1);
    assert.strictEqual(
      numberOfDuplicates([makeClassifier(), makeClassifier(), makeClassifier()]),
      2,
    );
    assert.strictEqual(
      numberOfDuplicates([
        makeClassifier(),
        makeClassifier(),
        makeClassifier(),
        makeClassifier(),
      ]),
      3,
    );
    assert.strictEqual(
      numberOfDuplicates([
        makeClassifier(),
        makeClassifier(),
        makeClassifier(),
        makeClassifier(),
        makeClassifier({ classifier: "23-01" }),
      ]),
      3,
    );
    assert.strictEqual(
      numberOfDuplicates([
        makeClassifier(),
        makeClassifier(),
        makeClassifier(),
        makeClassifier(),
        makeClassifier({ classifier: "23-01" }),
        makeClassifier({ classifier: "23-01" }),
      ]),
      4,
    );

    assert.strictEqual(
      numberOfDuplicates([
        makeClassifier(),
        makeClassifier(),
        makeClassifier(),
        makeClassifier(),
        makeClassifier({ classifier: "23-01" }),
        makeClassifier({ classifier: "23-01" }),
        makeClassifier({ classifier: "23-02" }),
        makeClassifier({ classifier: "23-02" }),
        makeClassifier({ classifier: "23-02" }),
        makeClassifier({ classifier: "23-02" }),
      ]),
      7,
    );

    assert.strictEqual(
      numberOfDuplicates([
        {
          classifier: "20-03",
          sd: "1/01/23",
          percent: 74.999,
          curPercent: 74.999,
          recPercent: 74.999,
          division: "ss",
          source: "Stage Score",
        },
        {
          classifier: "20-04",
          sd: "1/01/23",
          percent: 74.999,
          curPercent: 74.999,
          recPercent: 74.999,
          division: "ss",
          source: "Stage Score",
        },
        {
          classifier: "20-05",
          sd: "1/01/23",
          percent: 74.999,
          curPercent: 74.999,
          recPercent: 74.999,
          division: "ss",
          source: "Stage Score",
        },
        {
          classifier: "20-06",
          sd: "1/01/23",
          percent: 74.999,
          curPercent: 74.999,
          recPercent: 74.999,
          division: "ss",
          source: "Stage Score",
        },
        {
          classifier: "20-07",
          sd: "1/01/23",
          percent: 74.999,
          curPercent: 74.999,
          recPercent: 74.999,
          division: "ss",
          source: "Stage Score",
        },
        {
          classifier: "20-08",
          sd: "1/01/23",
          percent: 74.999,
          curPercent: 74.999,
          recPercent: 74.999,
          division: "ss",
          source: "Stage Score",
        },
        {
          classifier: "20-09",
          sd: "1/01/23",
          percent: 74.999,
          curPercent: 74.999,
          recPercent: 74.999,
          division: "ss",
          source: "Stage Score",
        },
        {
          classifier: "20-02",
          sd: "1/01/23",
          percent: 74.999,
          curPercent: 74.999,
          recPercent: 74.999,
          division: "ss",
          source: "Stage Score",
        },
        {
          classifier: "20-10",
          sd: "1/01/23",
          percent: 74.999,
          curPercent: 74.999,
          recPercent: 74.999,
          division: "ss",
          source: "Stage Score",
        },
      ]),
      0,
    );
  });

  it("grows window when needed for duplicate classifiers", () => {
    const curWindow = [];
    addToCurWindow(makeClassifier(), curWindow);
    assert.deepEqual(curWindow, [makeClassifier()]);

    addToCurWindow(makeClassifier({ classifier: "20-02" }), curWindow);
    addToCurWindow(makeClassifier({ classifier: "20-03" }), curWindow);
    addToCurWindow(makeClassifier({ classifier: "20-04" }), curWindow);
    addToCurWindow(makeClassifier({ classifier: "20-05" }), curWindow);
    addToCurWindow(makeClassifier({ classifier: "20-06" }), curWindow);
    addToCurWindow(makeClassifier({ classifier: "20-07" }), curWindow);
    addToCurWindow(makeClassifier({ classifier: "20-08" }), curWindow);

    assert.strictEqual(curWindow.length, 8);
    addToCurWindow(makeClassifier({ classifier: "20-09" }), curWindow);
    assert.strictEqual(curWindow.length, 8);
    assert.deepEqual(curWindow, [
      makeClassifier({ classifier: "20-02" }),
      makeClassifier({ classifier: "20-03" }),
      makeClassifier({ classifier: "20-04" }),
      makeClassifier({ classifier: "20-05" }),
      makeClassifier({ classifier: "20-06" }),
      makeClassifier({ classifier: "20-07" }),
      makeClassifier({ classifier: "20-08" }),
      makeClassifier({ classifier: "20-09" }),
    ]);

    addToCurWindow(makeClassifier({ classifier: "20-09" }), curWindow);
    assert.strictEqual(curWindow.length, 9);
    addToCurWindow(makeClassifier({ classifier: "20-10" }), curWindow);
    assert.strictEqual(curWindow.length, 9);
    assert.deepEqual(curWindow, [
      makeClassifier({ classifier: "20-03" }),
      makeClassifier({ classifier: "20-04" }),
      makeClassifier({ classifier: "20-05" }),
      makeClassifier({ classifier: "20-06" }),
      makeClassifier({ classifier: "20-07" }),
      makeClassifier({ classifier: "20-08" }),
      makeClassifier({ classifier: "20-09" }),
      makeClassifier({ classifier: "20-09" }),
      makeClassifier({ classifier: "20-10" }),
    ]);
    addToCurWindow(makeClassifier({ classifier: "20-02" }), curWindow);
    addToCurWindow(makeClassifier({ classifier: "20-02" }), curWindow);
    assert.strictEqual(curWindow.length, 10);
    addToCurWindow(makeClassifier({ classifier: "21-01" }), curWindow);
    assert.strictEqual(curWindow.length, 10);
    assert.deepEqual(curWindow, [
      makeClassifier({ classifier: "20-05" }),
      makeClassifier({ classifier: "20-06" }),
      makeClassifier({ classifier: "20-07" }),
      makeClassifier({ classifier: "20-08" }),
      makeClassifier({ classifier: "20-09" }),
      makeClassifier({ classifier: "20-09" }),
      makeClassifier({ classifier: "20-10" }),
      makeClassifier({ classifier: "20-02" }),
      makeClassifier({ classifier: "20-02" }),
      makeClassifier({ classifier: "21-01" }),
    ]);
  });
});
