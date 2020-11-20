import React from "react";
import Modal, {ModalBody, ModalFooter, ModalHeader} from "../Modal";
import type {StepDefinition, RegionDefinition} from "../Test";

type SelectedRegionModalProps = {
  region: RegionDefinition;
  onClose: () => void;
  onSelect: (step: StepDefinition) => void
};

const SelectedRegionModal = ({region, onClose, onSelect}: SelectedRegionModalProps) => (
  <Modal onClose={onClose}>
    <ModalBody>
      <ModalHeader>
        {region.text} <span className="font-bold">{region.type}</span>
      </ModalHeader>
    </ModalBody>
    <ModalFooter>
      <button className="shadow-md bg-green-700 hover:bg-green-800 text-white font-medium py-2 px-4 rounded-full my-2 ml-2"
              onClick={() => onSelect({
                type: 'assertion',
                definition: {
                  type: 'text',
                  target: region.text
                }
              })}
      >
        Assert visible
      </button>

      <button className="shadow-md bg-blue-700 hover:bg-blue-800 text-white font-medium py-2 px-4 rounded-full my-2 ml-2"
              onClick={() => onSelect({
                type: 'event',
                definition: {
                  type: 'click',
                  target: region.text
                }
              })}
      >
        Click
      </button>
    </ModalFooter>
  </Modal>
);

export default SelectedRegionModal;
