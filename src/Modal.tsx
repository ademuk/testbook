import React, { useEffect } from "react";

function useKeyboardEvent(key: string, callback: () => void) {
  useEffect(() => {
    const handler = function (event: KeyboardEvent) {
      if (event.key === key) {
        callback();
      }
    };
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
    };
  }, [key, callback]);
}

type ModalProps = {
  onClose: () => void;
};

const Modal: React.FC<ModalProps> = ({ children, onClose }) => {
  useKeyboardEvent("Escape", onClose);

  return (
    <div className="fixed bottom-0 inset-x-0 px-4 pb-4 sm:inset-0 sm:flex sm:items-center sm:justify-center">
      <div className="fixed inset-0 transition-opacity">
        <div
          className="absolute inset-0 bg-gray-900 opacity-50"
          onClick={onClose}
        />
      </div>
      <div
        className="bg-white rounded-lg overflow-hidden shadow-xl transform transition-all sm:max-w-6xl sm:w-full"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-headline"
      >
        {children}
      </div>
    </div>
  );
};

export const ModalHeader: React.FC = ({ children }) => (
  <h3
    className="text-lg leading-6 font-medium text-gray-900"
    id="modal-headline"
  >
    {children}
  </h3>
);

export const ModalBody: React.FC = ({ children }) => (
  <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
    <div className="mt-3 sm:mt-0 text-left">{children}</div>
  </div>
);

export const ModalFooter: React.FC = ({ children }) => (
  <div className="bg-gray-100 px-4 py-3 sm:px-6 flex justify-end">
    {children}
  </div>
);

export default Modal;
