import React from "react";
import StatusLink from "../StatusLink";
import type {StepDefinition, StepResult} from "../Test";
import {renderMockCallArgsLabel} from "./SelectedMockCallModal";

const defaultStepRenderer = (step: StepDefinition) => Object.entries(step).map(([key, val]) =>
  `${key}: ${typeof val == 'object' ? JSON.stringify(val) : val}`
).join(', ');

const STEP_LABELS: {[key: string]: (step: StepDefinition) => string} = {
  render: () => `Render component`,
  event: ({definition: {target}}: StepDefinition) => `Click on "${target}"`,
  assertion: ({definition: {type, target}}: StepDefinition) =>
    type === 'text' ? `Assert "${target}" is visible` : `Assert ${type} ${target.name} ${renderMockCallArgsLabel(target.args)} called`,
  mock: ({definition: {name, args}}: StepDefinition) => `Mock ${name} ${renderMockCallArgsLabel(args)}`,
};

export const renderStepLabel = (step: StepDefinition) =>
  STEP_LABELS[step.type] ? STEP_LABELS[step.type](step) : defaultStepRenderer(step);

const STEP_EDIT_LABELS: {[key: string]: (step: StepDefinition) => string} = {
  render: () => 'props',
};

const editStepLabel = (step: StepDefinition) =>
  STEP_EDIT_LABELS[step.type] ? STEP_EDIT_LABELS[step.type](step) : 'Edit';

type StepProps = {
  step: StepDefinition;
  result: StepResult;
  selected: boolean;
  active: boolean;
  link: string;
  onDelete: () => void;
  onEdit: () => void;
  onEditWrapper: () => void;
  onResultClick?: (e: React.MouseEvent<HTMLElement>) => void;
};

const Step = ({step, result: {result}, selected, active, link, onDelete, onEdit, onEditWrapper, onResultClick}: StepProps) => {
  const {type} = step;
  return (
    <StatusLink
      link={link}
      status={result}
      subTitle={type}
      selected={selected}
      active={active}
      onResultClick={onResultClick}
    >
      {renderStepLabel(step)}

      <div className="block">
        {(active && ['render', 'mock'].includes(type)) && <button
          onClick={onEdit}
          className="text-xs font-semibold text-white hover:bg-white hover:text-gray-800 py-1 px-2 border border-whit rounded-full my-2 mr-2">
          {editStepLabel(step)}
        </button>}

        {(active && ['render'].includes(type)) && <button
          onClick={onEditWrapper}
          className="text-xs font-semibold text-white hover:bg-white hover:text-gray-800 py-1 px-2 border border-whit rounded-full my-2 mr-2">
          wrapper
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
