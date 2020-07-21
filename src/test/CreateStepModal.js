import React from "react";

const CreateStepModal = ({region, onClose, onSelect}) => (
  <div className="modal fixed w-full h-full top-0 left-0 flex items-center justify-center">
    <div className="modal-overlay absolute w-full h-full bg-gray-900 opacity-50" onClick={onClose} />

    <div className="modal-container bg-white w-11/12 md:max-w-md mx-auto rounded shadow-lg z-50 overflow-y-auto">
      <div
        className="modal-close absolute top-0 right-0 cursor-pointer flex flex-col items-center mt-4 mr-4 text-white text-sm z-50">
        <svg className="fill-current text-white" xmlns="http://www.w3.org/2000/svg" width="18" height="18"
             viewBox="0 0 18 18">
          <path
            d="M14.53 4.53l-1.06-1.06L9 7.94 4.53 3.47 3.47 4.53 7.94 9l-4.47 4.47 1.06 1.06L9 10.06l4.47 4.47 1.06-1.06L10.06 9z" />
        </svg>
        <span className="text-sm">(Esc)</span>
      </div>

      {/*Add margin if you want to see some of the overlay behind the modal*/}
      <div className="modal-content py-4 text-left px-6">
        <div className="flex justify-between items-center pb-3">
          <p className="text-2xl font-bold">{region.text} {region.type}</p>
          <div className="modal-close cursor-pointer z-50">
            <svg className="fill-current text-black" xmlns="http://www.w3.org/2000/svg" width="18" height="18"
                 viewBox="0 0 18 18" onClick={onClose}>
              <path
                d="M14.53 4.53l-1.06-1.06L9 7.94 4.53 3.47 3.47 4.53 7.94 9l-4.47 4.47 1.06 1.06L9 10.06l4.47 4.47 1.06-1.06L10.06 9z" />
            </svg>
          </div>
        </div>

        <button className="bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded-full my-2 mr-2"
                onClick={() => onSelect({
                  type: 'event',
                  eventType: 'click',
                  target: region.text
                })}
        >
          Click
        </button>

        <button className="bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded-full my-2 mr-2"
                onClick={() => onSelect({
                  type: 'assertion',
                  assertionType: 'textIsPresent',
                  target: region.text
                })}
        >
          Assert present
        </button>

      </div>
    </div>
  </div>
);

export default CreateStepModal;
