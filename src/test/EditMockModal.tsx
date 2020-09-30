import React, {useEffect, useState} from "react";
import {renderStepLabel} from "./Step";
import Modal, {ModalBody, ModalFooter, ModalHeader} from "../Modal";
import type {StepDefinition} from '../Test';

export type EditStepProps = {
  step: StepDefinition;
  onClose: () => void;
  onUpdateStep: (step: StepDefinition) => void;
  file: string;
  exportName: string;
}

const EditMockModal: React.FC<EditStepProps> = ({step, onClose, onUpdateStep}) => {
  const [returnValue, setReturnValue] = useState('');
  const [isValidJson, setIsValidJson] = useState(true);

  useEffect(() => {
    setReturnValue(JSON.stringify(step.definition.return))
  }, [step.definition.return]);

  useEffect(() => {
    try {
      JSON.parse(returnValue);
      setIsValidJson(true);
    } catch (e) {
      setIsValidJson(false);
    }
  }, [returnValue]);

  return (
    <Modal onClose={onClose}>
      <form onSubmit={(event) => {
        event.preventDefault();

        if (!isValidJson) {
          return;
        }

        onUpdateStep({...step, definition: {...step.definition, return: JSON.parse(returnValue)}});
      }}>
        <ModalBody>
          <ModalHeader>
            {renderStepLabel(step)} <span className="font-bold">return</span>
          </ModalHeader>
          <div className="mt-2 flex">
            <textarea
              defaultValue={returnValue}
              onChange={({target: {value}}) => setReturnValue(value)}
              placeholder="json"
              className={`flex-1 py-2 px-3 h-56 text-gray-700 shadow appearance-none rounded font-mono leading-tight focus:outline-none focus:shadow-outline border ${isValidJson ? 'border-gray-200' : 'border-red-400'}`}
            >
            </textarea>
          </div>
        </ModalBody>
        <ModalFooter>
          <button type="submit"
                  className="border border-blue-700 hover:border-transparent text-blue-700 hover:text-white hover:bg-blue-700 font-medium py-2 px-4 rounded-full my-2 mr-2">
            Save
          </button>
          <button type="button"
                  onClick={onClose}
                  className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-full my-2 mr-2">
            Cancel
          </button>
          {!isValidJson && <div className="text-red-700 py-4 mr-auto">
            JSON validation failed
          </div>}
        </ModalFooter>
      </form>
    </Modal>
  )
};

export default EditMockModal;
