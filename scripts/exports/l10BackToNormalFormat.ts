import { idToClassifier } from "@api/dataUtil/classifiersData";
import { loadJSON } from "@api/utils";

const go = () => {
  const l10 = Object.fromEntries(
    loadJSON("../../l10Prophecy.json").map(cur => {
      const classifier = idToClassifier[cur.classifier_id];
      return [classifier, cur.hhf];
    }),
  );

  console.log(JSON.stringify(l10, null, 2));
};

go();
