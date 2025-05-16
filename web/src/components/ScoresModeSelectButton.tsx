import { SelectButton, type SelectButtonProps } from "primereact/selectbutton";

import { scoresModes, type ScoresMode } from "@data/types/ScoresModes";

export const defaultScoresMode = scoresModes[0];

interface ScoresModeSelectButtonProps extends SelectButtonProps {
  mode: ScoresMode;
  setMode: (mode: ScoresMode) => void;
}

export const ScoresModeSelectButton = ({
  mode,
  setMode,
  ...props
}: ScoresModeSelectButtonProps) => (
  <SelectButton
    allowEmpty={false}
    options={scoresModes.map(m => ({
      label: m[0].toUpperCase() + m.substring(1),
      value: m,
    }))}
    value={mode}
    onChange={e => setMode(e.value)}
    {...props}
  />
);
