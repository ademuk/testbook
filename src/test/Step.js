import StatusLink from "../StatusLink";
import React from "react";

const defaultStepRenderer = (step) => Object.entries(step).map(([key, val]) =>
  `${key}: ${typeof val == 'object' ? JSON.stringify(val) : val}`
).join(', ');

const STEP_LABELS = {
  render: () => `Render component`,
  event: ({definition: {target}}) => `Click on "${target}"`,
  assertion: ({definition: {type, target}}) =>
    type === 'text' ? `Assert "${target}" is visible` : `Assert ${type} ${target.name} ${target.args} called`,
  mock: ({definition: {name, args}}) => `Mock ${name} ${args}`,
};

export const renderStepLabel = (step) =>
  STEP_LABELS[step.type] ? STEP_LABELS[step.type](step) : defaultStepRenderer(step);

const STEP_EDIT_LABELS = {
  render: () => 'Edit props',
};

const editStepLabel = (step) =>
  STEP_EDIT_LABELS[step.type] ? STEP_EDIT_LABELS[step.type](step) : 'Edit';

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

      <div className="block">
        {(active && ['render', 'mock'].includes(type)) && <button
          onClick={onEdit}
          className="text-xs font-semibold text-white hover:bg-white hover:text-gray-800 py-1 px-2 border border-whit rounded-full my-2 mr-2">
          {editStepLabel(step)}
        </button>}

        {(active && type !== 'render') && <button
          onClick={onDelete}
          className="text-xs font-semibold text-red-600 hover:bg-red-600 hover:text-white py-1 px-2 border border-red-600 rounded-full my-2 mr-2">
          Remove
        </button>}
      </div>
    </StatusLink>
  )
};

export default Step;
