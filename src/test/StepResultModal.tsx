import { Fragment } from "react";
import Modal, { ModalBody, ModalFooter, ModalHeader } from "../Modal";
import type { StepDefinition, StepResult } from "../Test";
import { renderStepLabel } from "./Step";

type StepResultModalProps = {
  stepAndResult: [StepDefinition, StepResult];
  onClose: () => void;
};

const capitalise = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

const StepResultModal = ({
  stepAndResult: [step, { result, error }],
  onClose,
}: StepResultModalProps) => (
  <Modal onClose={onClose}>
    <ModalBody>
      <ModalHeader>
        {renderStepLabel(step)} <span className="font-bold">{result}</span>
      </ModalHeader>
      {error &&
        Object.entries(error).map(([key, value]) => (
          <Fragment key={key}>
            <h2 className="font-bold mt-2 mb-1">{capitalise(key)}</h2>
            <code className="whitespace-pre-line text-xs">{value}</code>
          </Fragment>
        ))}
    </ModalBody>
    <ModalFooter>
      <button
        className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-full my-2 mr-2"
        onClick={onClose}
      >
        Close
      </button>
    </ModalFooter>
  </Modal>
);

export default StepResultModal;
