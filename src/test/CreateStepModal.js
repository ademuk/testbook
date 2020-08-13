import React from "react";

const CreateStepModal = ({region, onClose, onSelect}) => (
  <div className="fixed bottom-0 inset-x-0 px-4 pb-4 sm:inset-0 sm:flex sm:items-center sm:justify-center">
    <div className="fixed inset-0 transition-opacity">
      <div className="absolute inset-0 bg-gray-900 opacity-50" onClick={onClose} />
    </div>

    <div className="bg-white rounded-lg overflow-hidden shadow-xl transform transition-all sm:max-w-lg sm:w-full"
         role="dialog" aria-modal="true" aria-labelledby="modal-headline">
      <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
        <div className="sm:flex sm:items-start">
          <div className="mt-3 text-center sm:mt-0 sm:text-left">
            <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-headline">
              {region.text} <span className="font-bold">{region.type}</span>
            </h3>
          </div>
        </div>
      </div>
      <div className="bg-gray-100 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
        <button className="bg-blue-700 hover:bg-blue-800 text-white font-medium py-2 px-4 rounded-full my-2 mr-2"
                onClick={() => onSelect({
                  type: 'event',
                  eventType: 'click',
                  target: region.text
                })}
        >
          Click
        </button>

        <button className="bg-green-700 hover:bg-green-800 text-white font-medium py-2 px-4 rounded-full my-2 mr-2"
                onClick={() => onSelect({
                  type: 'assertion',
                  assertionType: 'textIsPresent',
                  target: region.text
                })}
        >
          Assert visible
        </button>
      </div>
    </div>
  </div>
);

export default CreateStepModal;
