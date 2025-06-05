import assert from "assert";
import { describe, it } from "node:test";

import orderedUniqBy from "../orderedUniqBy";

describe("orderedUniqBy", () => {
  it("works like _.uniqBy, but preserves the original order", () => {
    assert.deepEqual(
      orderedUniqBy(
        [
          { x: 1, classifier: "20-01" },
          { x: 2, classifier: "20-02" },
          { x: 3, classifier: "20-03" },
          { x: 4, classifier: "20-01" },
          { x: 5, classifier: "20-02" },
          { x: 6, classifier: "20-04" },
          { x: 7, classifier: "20-01" },
          { x: 8, classifier: "20-05" },
          { x: 9, classifier: "20-05" },
        ],
        "classifier",
      ).map(c => c.x),
      [1, 2, 3, 6, 8],
    );
  });
});
