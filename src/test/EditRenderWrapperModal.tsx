import React, {useEffect, useState} from "react";
import {renderStepLabel} from "./Step";
import Modal, {ModalBody, ModalFooter, ModalHeader} from "../Modal";
import type {EditStepProps} from './EditMockModal';
import LoadingIndicator from "../LoadingIndicator";

enum WrapperOptionsStatus {
  loading,
  error,
  loaded
}

type WrapperOptions = {
  file: string,
  exportName: string,
  propTypes: {[key: string]: [string, boolean]}
}[]

const EditRenderWrapperModal: React.FC<EditStepProps> = ({step, onClose, onUpdateStep, file, exportName}) => {
  const [wrapperOptions, setPropTypes] = useState<WrapperOptions>();
  const [wrapperOptionsStatus, setWrapperOptionsStatus] = useState<WrapperOptionsStatus>();

  useEffect(() => {
    setWrapperOptionsStatus(WrapperOptionsStatus.loading);

    fetch(`/component/wrapper`)
      .then(res => res.json())
      .then(setPropTypes)
      .then(() => setWrapperOptionsStatus(WrapperOptionsStatus.loaded))
      .catch(() => setWrapperOptionsStatus(WrapperOptionsStatus.error))
  }, [file, exportName]);

  const handleWrapperSelect = (file: string, exportName: string) => {
    if (file === step.definition.wrapper?.file && exportName === step.definition.wrapper?.exportName) {
      return onUpdateStep({
        ...step,
        definition: {
          ...step.definition,
          wrapper: null
        }
      })
    }

    onUpdateStep({
      ...step,
      definition: {
        ...step.definition,
        wrapper: {
          file,
          exportName,
          props: {}
        }
      }
    });
  };

  const selectedWrapper = step.definition.wrapper;

  return (
    <Modal onClose={onClose}>
      <ModalBody>
        <ModalHeader>
          {renderStepLabel(step)} <span className="font-bold">wrapper</span>
        </ModalHeader>

        <div className="mt-2">
          {wrapperOptionsStatus === WrapperOptionsStatus.loading && <LoadingIndicator>Looking for wrapper options...</LoadingIndicator>}
          {wrapperOptionsStatus === WrapperOptionsStatus.error && <div className="text-red-700">There was an issue fetching wrapper options</div>}
          {
            wrapperOptions ? wrapperOptions
              .map(({file, exportName}) =>
                <div className="mb-4" key={file + exportName}>
                  <button type="button"
                          onClick={() => handleWrapperSelect(file, exportName)}
                          className={
                            `${selectedWrapper && selectedWrapper.file === file && selectedWrapper.exportName === exportName ? 'bg-blue-700 text-white': 'text-blue-700'} 
                            inline-flex items-center shadow-md border border-blue-700 hover:border-transparent hover:text-white hover:bg-blue-700 font-medium py-2 px-4 rounded-full my-2 mr-2`
                          }>
                    {file}.{exportName}
                    {
                      selectedWrapper && selectedWrapper.file === file && selectedWrapper.exportName === exportName &&
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" height="16" width="16" className="ml-2">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    }
                  </button>
                </div>
              ) : null
          }
          {
            (wrapperOptions && Object.keys(wrapperOptions).length === 0) ?
              <p className="text-sm leading-5 text-gray-500">No wrapper options were found.</p> : null
          }
        </div>
      </ModalBody>
      <ModalFooter>
        <button type="button"
                onClick={onClose}
                className="shadow-md border border-blue-700 hover:border-transparent text-blue-700 hover:text-white hover:bg-blue-700 font-medium py-2 px-4 rounded-full my-2 ml-2">
          Done
        </button>
      </ModalFooter>
    </Modal>
  )
};

export default EditRenderWrapperModal;
