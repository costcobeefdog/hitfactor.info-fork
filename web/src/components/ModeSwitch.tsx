import { SelectButton } from "primereact/selectbutton";

const ModeSwitch = ({ mode, setMode, modes }) => (
  <div className="card flex justify-content-center mt-4 mb-2 text-xs md:text-sm">
    <SelectButton
      className="compact"
      allowEmpty={false}
      options={modes}
      value={mode}
      onChange={e => setMode(e.value)}
    />
  </div>
);

export default ModeSwitch;
