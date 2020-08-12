import StatusLink from "../StatusLink";
import React from "react";

const defaultStepRenderer = (step) => Object.entries(step).map(([key, val]) =>
  `${key}: ${typeof val == 'object' ? JSON.stringify(val) : val}`
).join(', ');

const STEP_RENDERS = {
  render: ({target}) => `Render component`,
  event: ({target}) => `Click on "${target}"`,
  assertion: ({target}) => `Assert "${target}" is visible`
};

export const renderStepLabel = (step) =>
  STEP_RENDERS[step.type] ? STEP_RENDERS[step.type](step) : defaultStepRenderer(step);


const Step = ({step, result: {result}, selected, active, link, onDelete, onEdit}) => {
  const {type} = step;
  return (
    <StatusLink
      link={link}
      status={result}
      subTitle={type}
      selected={selected}
      active={active}
    >
      {renderStepLabel(step)}

      {(active && type !== 'render') && <button
        onClick={onDelete}
        className="block text-xs font-semibold text-red-600 hover:bg-red-600 hover:text-white py-1 px-2 border border-red-600 rounded-full my-2 mr-2">
        Remove
      </button>}

      {(active && type === 'render') && <button
        onClick={onEdit}
        className="block text-xs font-semibold text-white hover:bg-white hover:text-gray-800 py-1 px-2 border border-whit rounded-full my-2 mr-2">
        Edit props
      </button>}
    </StatusLink>
  )
};

export default Step;
