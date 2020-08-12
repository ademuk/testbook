import React, {useEffect, useState} from "react";
import {renderStepLabel} from "./Step";

const EditStepModal = ({step, onClose, onSubmit, file, exportName}) => {
  const [propTypes, setPropTypes] = useState(null);
  const [props, setProps] = useState(null);

  useEffect(() => {
    fetch(`/component/propTypes?file=${file}&exportName=${exportName}`)
      .then(res => res.json())
      .then(setPropTypes)
  }, [file, exportName]);

  useEffect(() => {
    setProps(step.props)
  }, [step.props]);

  return (
    <div className="fixed bottom-0 inset-x-0 px-4 pb-4 sm:inset-0 sm:flex sm:items-center sm:justify-center">
      <div className="fixed inset-0 transition-opacity">
        <div className="absolute inset-0 bg-gray-900 opacity-50" onClick={onClose} />
      </div>

      <div className="bg-white rounded-lg overflow-hidden shadow-xl transform transition-all sm:max-w-lg sm:w-full"
           role="dialog" aria-modal="true" aria-labelledby="modal-headline">
        <form onSubmit={(event) => event.preventDefault() && onSubmit({...step, props})}>
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">

              <div className="mt-3 text-center sm:mt-0 sm:text-left">
                <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-headline">
                  <span className="font-bold">{renderStepLabel(step)}</span> props
                </h3>
                <div className="mt-2">
                  <div>
                    {
                      propTypes ? Object.entries(propTypes)
                        .map(([propName, [propType, required]]) =>
                          <div className="mb-4" key={propName}>
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor={propName}>
                              {propName}
                            </label>
                            <input
                              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                              id={propName}
                              type="text"
                              placeholder={propType}
                              name={propName}
                              required={required}
                              value={props[propName] || ''}
                              onChange={
                                ({target: {name, value}}) =>
                                  setProps(props => ({
                                    ...props,
                                    [name]: value
                                  }))
                              }
                            />
                          </div>
                        ) : null
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-100 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button type="submit"
                    className="bg-blue-700 hover:bg-blue-800 text-white font-medium py-2 px-4 rounded-full my-2 mr-2">
              Save
            </button>
            <button type="button"
                    onClick={onClose}
                    className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-full my-2 mr-2">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
};

export default EditStepModal;
