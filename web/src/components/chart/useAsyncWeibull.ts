import { useEffect, useState } from "react";

import WeibullWorker from "./useAsyncWeibullWorker?worker";

import { emptyWeibull, WeibullResult } from "../../../../shared/utils/weibull";

export interface AsyncWeibullResult extends WeibullResult {
  loading: boolean;
}

const pendingResult: AsyncWeibullResult = {
  ...emptyWeibull,
  loading: true,
};

export const useAsyncWeibull = (dataPoints: number[]) => {
  const [result, setResult] = useState<AsyncWeibullResult>(pendingResult);

  useEffect(() => {
    setResult(pendingResult);
    const worker = new WeibullWorker();
    worker.onmessage = e => setResult(e.data);
    worker.postMessage({ dataPoints });
    return () => worker.terminate();
  }, [dataPoints]);

  return result;
};
