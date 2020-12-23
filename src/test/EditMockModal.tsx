import { useState } from "react";
import * as React from "react";
// @ts-ignore
import JSONInput from "react-json-editor-ajrm";
// @ts-ignore
import locale from "react-json-editor-ajrm/locale/en";
import { renderStepLabel } from "./Step";
import Modal, { ModalBody, ModalFooter, ModalHeader } from "../Modal";
import type { StepDefinition } from "../Test";

export type EditStepProps = {
  step: StepDefinition;
  onClose: () => void;
  onUpdateStep: (step: StepDefinition) => void;
  file: string;
  exportName: string;
};

const EditMockModal: React.FC<EditStepProps> = ({
  step,
  onClose,
  onUpdateStep,
}) => {
  const [returnValue, setReturnValue] = useState(
    step.definition.return ? step.definition.return : {}
  );
  const [isValidJson, setIsValidJson] = useState(true);

  const handleReturnValueChange = ({
    error,
    jsObject,
  }: {
    error?: any;
    jsObject: any;
  }) => {
    setReturnValue(jsObject);
    setIsValidJson(error === false);
  };

  return (
    <Modal onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();

          if (!isValidJson) {
            return;
          }

          onUpdateStep({
            ...step,
            definition: { ...step.definition, return: returnValue },
          });
        }}
      >
        <ModalBody>
          <ModalHeader>
            {renderStepLabel(step)} <span className="font-bold">return</span>
          </ModalHeader>
          <div className="mt-2 flex">
            <JSONInput
              id="id"
              placeholder={step.definition.return}
              theme="light_mitsuketa_tribute"
              locale={locale}
              width="100%"
              height="550px"
              onChange={handleReturnValueChange}
              waitAfterKeyPress={0}
            />
          </div>
        </ModalBody>
        <ModalFooter>
          {!isValidJson && (
            <div className="text-red-700 py-4 mr-auto">
              JSON validation failed
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            className="shadow-md bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-full my-2 ml-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="shadow-md border border-blue-700 hover:border-transparent text-blue-700 hover:text-white hover:bg-blue-700 font-medium py-2 px-4 rounded-full my-2 ml-2"
          >
            Save
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
};

export default EditMockModal;
