import React from "react";
import Modal, {ModalBody, ModalFooter, ModalHeader} from "../Modal";

const SelectedRegionModal = ({region, onClose, onSelect}) => (
  <Modal onClose={onClose}>
    <ModalBody>
      <ModalHeader>
        {region.text} <span className="font-bold">{region.type}</span>
      </ModalHeader>
    </ModalBody>
    <ModalFooter>
      <button className="bg-blue-700 hover:bg-blue-800 text-white font-medium py-2 px-4 rounded-full my-2 mr-2"
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

      <button className="bg-green-700 hover:bg-green-800 text-white font-medium py-2 px-4 rounded-full my-2 mr-2"
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
    </ModalFooter>
  </Modal>
);

export default SelectedRegionModal;
