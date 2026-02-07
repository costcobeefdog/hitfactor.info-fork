"use client";

import { useEffect, useRef, DependencyList } from "react";

type EffectCallback<T extends DependencyList> = (previousInputs: T) => void;

const usePreviousEffect = <T extends DependencyList>(
  fn: EffectCallback<T>,
  inputs: T,
): void => {
  const previousInputsRef = useRef<T>([...inputs] as unknown as T);

  useEffect(() => {
    fn(previousInputsRef.current);
    previousInputsRef.current = [...inputs] as unknown as T;
  }, inputs); // eslint-disable-line react-hooks/exhaustive-deps
};

export default usePreviousEffect;
