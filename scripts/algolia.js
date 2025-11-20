import { getAlgoliaUrl } from "../api/src/db/utils";

const testAlgoliaUrl = async () => {
  const url = await getAlgoliaUrl();
  console.log(url);
};

testAlgoliaUrl();
