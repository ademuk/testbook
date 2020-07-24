import React from "react";

const CreateStepModal = ({region, onClose, onSelect}) => (
  <div className="modal fixed w-full h-full top-0 left-0 flex items-center justify-center">
    <div className="modal-overlay absolute w-full h-full bg-gray-900 opacity-50" onClick={onClose} />

    <div className="modal-container bg-white w-11/12 md:max-w-md mx-auto rounded shadow-lg z-50 overflow-y-auto">

      <div className="modal-content py-4 text-left px-6">
        <div className="flex justify-between items-center pb-3">
          <p className="text-2xl">
            <span className="font-bold">{region.text}</span> <span>{region.type}</span>
          </p>
          <div className="modal-close cursor-pointer z-50" onClick={onClose}>
            <svg className="fill-current text-black" xmlns="http://www.w3.org/2000/svg" width="18" height="18"
                 viewBox="0 0 18 18">
              <path
                d="M14.53 4.53l-1.06-1.06L9 7.94 4.53 3.47 3.47 4.53 7.94 9l-4.47 4.47 1.06 1.06L9 10.06l4.47 4.47 1.06-1.06L10.06 9z" />
            </svg>
          </div>
        </div>

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