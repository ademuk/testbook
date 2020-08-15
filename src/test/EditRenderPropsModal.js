import React, {useEffect, useState} from "react";
import {renderStepLabel} from "./Step";
import Modal, {ModalBody, ModalFooter, ModalHeader} from "../Modal";

const isValidJson = (value) => {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
};

const isValidProp = (value, propType, required) => {
  if (([undefined, ''].includes(value)) && required) {
    return false;
  }

  if (propType === 'object') {
    return isValidJson(value);
  }

  return true;
};

const validateProps = (props, propTypes) =>
  Object.entries(props).reduce((prev, [propName, value]) => ({
    ...prev,
    [propName]: isValidProp(value, ...propTypes[propName])
  }), {});

const serialiseProps = (props, propTypes) =>
  Object.entries(props).reduce((prev, [propName, value]) => ({
    ...prev,
    [propName]: serialiseProp(value, ...propTypes[propName])
  }), {});

const serialiseProp = (value, propType, required) => {
  if (propType === 'object') {
    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  }

  return value;
};

const deserialiseProps = (props, propTypes) =>
  Object.entries(props).reduce((prev, [propName, value]) => ({
    ...prev,
    [propName]: deserialiseProp(value, ...propTypes[propName])
  }), {});

const deserialiseProp = (value, propType, required) => {
  if (propType === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return value
    }
  }
  return value;
};

const EditRenderPropsModal = ({step, onClose, onUpdateStep, file, exportName}) => {
  const [propTypes, setPropTypes] = useState(null);
  const [props, setProps] = useState(null);
  const [propsValidation, setPropsValidation] = useState({});
  const [isFormDirty, setIsFormDirty] = useState(false);

  useEffect(() => {
    fetch(`/component/propTypes?file=${file}&exportName=${exportName}`)
      .then(res => res.json())
      .then(setPropTypes)
  }, [file, exportName]);

  useEffect(() => {
    if (propTypes) {
      setProps(deserialiseProps(step.definition.props, propTypes))
    }
  }, [step.definition.props, propTypes]);

  useEffect(() => {
    if (props && propTypes) {
      setPropsValidation(validateProps(props, propTypes));
    }
  }, [props, propTypes]);

  return (
    <Modal onClose={onClose}>
      <form onSubmit={(event) => {
        event.preventDefault();
        if (!Object.values(propsValidation).every(v => v)) {
          return;
        }
        onUpdateStep({
          ...step,
          definition: {
            ...step.definition,
            props: serialiseProps(props, propTypes)
          }
        });
      }}>
        <ModalBody>
          <ModalHeader>
            {renderStepLabel(step)} <span className="font-bold">props</span>
          </ModalHeader>

          <div className="mt-2">
            {
              propTypes ? Object.entries(propTypes)
                .map(([propName, [propType, required]]) =>
                  <div className="mb-4" key={propName}>
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor={propName}>
                      {propName}{required && <span>*</span>}
                    </label>
                    <input
                      className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${!propsValidation[propName] && isFormDirty ? 'border-red-400' : 'border-gray-200'}`}
                      id={propName}
                      type="text"
                      placeholder={propType}
                      name={propName}
                      required={required}
                      value={(props && props[propName]) || ''}
                      onChange={
                        ({target: {name, value}}) => {
                          setProps(props => ({
                            ...props,
                            [name]: value
                          }));
                          setIsFormDirty(true);
                        }
                      }
                    />
                  </div>
                ) : null
            }
            {
              propTypes && Object.entries(propTypes)
                .some(([propName, [propType, required]]) =>required) && <p className="text-sm leading-5 text-gray-500 text-right">* Required prop</p>
            }
            {
              (propTypes && Object.keys(propTypes).length === 0) ?
                <p className="text-sm leading-5 text-gray-500">No props were detected for this component.</p> : null
            }
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
        </ModalFooter>
      </form>
    </Modal>
  )
};

export default EditRenderPropsModal;
