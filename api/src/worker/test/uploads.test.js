import assert, { match } from "assert";
import test, { describe, it } from "node:test";

import { arrayCombination, classifiersAndShootersFromScores } from "../uploads";

const scoreFactory = (classifier, division, memberNumber) => ({
  classifier,
  division,
  memberNumber,
  classifierDivision: [classifier, division].join(":"),
  memberNumberDivision: [memberNumber, division].join(":"),
});

test("arrayCombination", () => {
  assert.deepEqual(
    arrayCombination(["a", "b", "c", "d"], [1, 2], (a, b) => a + b),
    ["a1", "a2", "b1", "b2", "c1", "c2", "d1", "d2"],
  );

  assert.deepEqual(
    arrayCombination(["a"], [1, 2], (a, b) => a + b),
    ["a1", "a2"],
  );

  assert.deepEqual(
    arrayCombination(["a"], [1], (a, b) => a + b),
    ["a1"],
  );
  assert.deepEqual(
    arrayCombination(["a"], [1, 2, 3, 4], (a, b) => a + b),
    ["a1", "a2", "a3", "a4"],
  );
});

describe("classifiersAndShootersFromScores", () => {
  it("extracts classifiers and shooters from classifier scores", () => {
    const scores = [
      scoreFactory("09-01", "co", "A123"),
      scoreFactory("09-02", "co", "A123"),
      scoreFactory("09-03", "opn", "A123"),
      scoreFactory("09-03", "opn", "A256"),
    ];

    assert.deepEqual(
      classifiersAndShootersFromScores(scores).classifiers.map(c => c.classifierDivision),
      ["09-01:co", "09-02:co", "09-03:opn"],
    );
    assert.deepEqual(
      classifiersAndShootersFromScores(scores).shooters.map(c => c.memberNumberDivision),
      ["A123:co", "A123:opn", "A256:opn"],
    );
  });

  it("combines shooters from classifiers and match scores", () => {
    const scores = [
      scoreFactory("09-01", "co", "A123"),
      scoreFactory("09-02", "co", "A123"),
      scoreFactory("09-03", "opn", "A123"),
      scoreFactory("09-03", "opn", "A256"),
    ];

    const matchScores = [
      {
        memberNumberDivision: "A999123:co",
      },
    ];

    assert.deepEqual(
      classifiersAndShootersFromScores(scores, matchScores).classifiers.map(
        c => c.classifierDivision,
      ),
      ["09-01:co", "09-02:co", "09-03:opn"],
    );
    assert.deepEqual(
      classifiersAndShootersFromScores(scores, matchScores).shooters.map(
        c => c.memberNumberDivision,
      ),
      ["A123:co", "A123:opn", "A256:opn", "A999123:co"],
    );
  });
});
