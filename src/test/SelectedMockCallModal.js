import React from "react";
import Modal, {ModalBody, ModalFooter, ModalHeader} from "../Modal";

const SelectedMockCallModal = ({selectedMockCall, onClose, onUpdateStep}) => {
  const [name, args] = selectedMockCall;

  return (
    <Modal onClose={onClose}>
      <ModalBody>
        <ModalHeader>
          {name} <span className="font-bold">{args}</span>
        </ModalHeader>
      </ModalBody>
      <ModalFooter>
        <button className="bg-blue-700 hover:bg-blue-800 text-white font-medium py-2 px-4 rounded-full my-2 mr-2"
                onClick={() => onUpdateStep({
                  type: 'mock',
                  definition: {
                    name,
                    args,
                    return: null
                  },
                })}
        >
          Mock
        </button>

        <button className="bg-green-700 hover:bg-green-800 text-white font-medium py-2 px-4 rounded-full my-2 mr-2"
                onClick={() => onUpdateStep({
                  type: 'assertion',
                  definition: {
                    type: "mock",
                    target: {
                      name,
                      args
                    }
                  }
                })}
        >
          Assert called
        </button>
      </ModalFooter>
    </Modal>
  )
};

export default SelectedMockCallModal;
